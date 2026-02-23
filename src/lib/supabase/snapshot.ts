import "server-only";

import type { Dataset, DatasetMeta, DataRow } from "@/lib/data-processing/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "snapshots";
const DATASET_PATH = "active/dataset.json";
const LOGS_PATH = "logs/upload-log.json";

export type UploadLogEntry = {
  timestamp: string;
  fileName: string;
  sheetName: string;
  rowCount: number;
  mode: "replace" | "append";
  totalRowsAfter: number;
};

async function ensureBucket(supabase: ReturnType<typeof getSupabaseServerClient>) {
  await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 52428800,
  });
}

async function uploadJSON(supabase: ReturnType<typeof getSupabaseServerClient>, path: string, data: unknown) {
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: "application/json" });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { statusCode?: number; message?: string };
  if (anyErr.statusCode === 404) return true;
  const msg = String(anyErr.message ?? "");
  return msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("object not found");
}

async function downloadJSONOptional<T>(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  path: string,
  { retries = 0 }: { retries?: number } = {},
): Promise<T | null> {
  let attempt = 0;
  // Retry covers eventual consistency on read-after-write for Storage.
  // We only return null when we're confident the object is absent.
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (!error) {
      const text = await data.text();
      return JSON.parse(text) as T;
    }

    if (isNotFoundError(error)) {
      if (attempt < retries) {
        attempt++;
        await sleep(150 * 2 ** (attempt - 1));
        continue;
      }
      return null;
    }

    if (attempt < retries) {
      attempt++;
      await sleep(150 * 2 ** (attempt - 1));
      continue;
    }
    throw new Error(`Storage download failed: ${String((error as { message?: string }).message ?? error)}`);
  }
}

// --- Public API ---

export async function getActiveSnapshot(): Promise<Dataset | null> {
  try {
    const supabase = getSupabaseServerClient();
    return await downloadJSONOptional<Dataset>(supabase, DATASET_PATH);
  } catch (err) {
    console.warn("getActiveSnapshot failed:", err);
    return null;
  }
}

function rowKey(r: DataRow): string {
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : "");
  const norm = (v: unknown) => String(v ?? "").trim();
  return [
    norm(r.rutBase),
    norm(r.tipoBase),
    norm(r.tipoLlamada),
    iso(r.fechaCarga),
    iso(r.fechaGestion),
    norm(r.conecta),
    norm(r.interesa),
    norm(r.regimen),
    norm(r.sedeInteres),
    norm(r.afCampus),
    norm(r.mcCampus),
    norm(r.semana),
    norm(r.af),
    iso(r.fechaAf),
    norm(r.mc),
    iso(r.fechaMc),
  ].join("|");
}

function dedupeRows(rows: DataRow[]): DataRow[] {
  const seen = new Set<string>();
  const out: DataRow[] = [];
  for (const r of rows) {
    const key = rowKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function replaceSnapshot(dataset: Dataset): Promise<{ meta: DatasetMeta }> {
  const dedupedRows = dedupeRows(dataset.rows);
  const next: Dataset = {
    meta: { ...dataset.meta, importedAtISO: new Date().toISOString(), rowCount: dedupedRows.length },
    rows: dedupedRows,
  };
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);
  await uploadJSON(supabase, DATASET_PATH, next);
  await addLogEntry(supabase, {
    timestamp: new Date().toISOString(),
    fileName: next.meta.sourceFileName,
    sheetName: next.meta.sheetName,
    rowCount: next.meta.rowCount,
    mode: "replace",
    totalRowsAfter: next.rows.length,
  });
  return { meta: next.meta };
}

export async function appendSnapshot(newDataset: Dataset): Promise<{ meta: DatasetMeta; totalRows: number }> {
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);

  const existing = await downloadJSONOptional<Dataset>(supabase, DATASET_PATH, { retries: 4 });
  const mergedRows: DataRow[] = dedupeRows(existing ? [...existing.rows, ...newDataset.rows] : [...newDataset.rows]);

  const mergedMeta: DatasetMeta = {
    importedAtISO: new Date().toISOString(),
    sourceFileName: existing
      ? `${existing.meta.sourceFileName} + ${newDataset.meta.sourceFileName}`
      : newDataset.meta.sourceFileName,
    sheetName: existing?.meta.sheetName ?? newDataset.meta.sheetName,
    rowCount: mergedRows.length,
  };

  const merged: Dataset = { meta: mergedMeta, rows: mergedRows };
  await uploadJSON(supabase, DATASET_PATH, merged);

  await addLogEntry(supabase, {
    timestamp: new Date().toISOString(),
    fileName: newDataset.meta.sourceFileName,
    sheetName: newDataset.meta.sheetName,
    rowCount: newDataset.meta.rowCount,
    mode: "append",
    totalRowsAfter: mergedRows.length,
  });

  return { meta: mergedMeta, totalRows: mergedRows.length };
}

export async function applySnapshotUpdate(opts: {
  mode: "replace" | "append";
  datasets: Dataset[];
  fileNames: string[];
}): Promise<{ meta: DatasetMeta; totalRows: number }> {
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);

  const incomingRows: DataRow[] = opts.datasets.flatMap((d) => d.rows);
  const existing = opts.mode === "append"
    ? await downloadJSONOptional<Dataset>(supabase, DATASET_PATH, { retries: 4 })
    : null;

  const mergedRows = dedupeRows(existing ? [...existing.rows, ...incomingRows] : [...incomingRows]);

  const mergedMeta: DatasetMeta = {
    importedAtISO: new Date().toISOString(),
    sourceFileName: opts.fileNames.join(" + "),
    sheetName: opts.datasets.length === 1 ? opts.datasets[0]!.meta.sheetName : "MULTI",
    rowCount: mergedRows.length,
  };

  const merged: Dataset = { meta: mergedMeta, rows: mergedRows };
  await uploadJSON(supabase, DATASET_PATH, merged);

  await addLogEntry(supabase, {
    timestamp: new Date().toISOString(),
    fileName: mergedMeta.sourceFileName,
    sheetName: mergedMeta.sheetName,
    rowCount: incomingRows.length,
    mode: opts.mode,
    totalRowsAfter: mergedRows.length,
  });

  return { meta: mergedMeta, totalRows: mergedRows.length };
}

// --- Upload Logs ---

async function addLogEntry(supabase: ReturnType<typeof getSupabaseServerClient>, entry: UploadLogEntry) {
  try {
    const logs = await downloadJSONOptional<UploadLogEntry[]>(supabase, LOGS_PATH) || [];
    logs.push(entry);
    await uploadJSON(supabase, LOGS_PATH, logs);
  } catch (err) {
    console.warn("Failed to write upload log:", err);
  }
}

export async function getUploadLogs(): Promise<UploadLogEntry[]> {
  try {
    const supabase = getSupabaseServerClient();
    return await downloadJSONOptional<UploadLogEntry[]>(supabase, LOGS_PATH) || [];
  } catch {
    return [];
  }
}
