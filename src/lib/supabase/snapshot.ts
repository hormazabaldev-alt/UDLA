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

async function downloadJSON<T>(supabase: ReturnType<typeof getSupabaseServerClient>, path: string): Promise<T | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) return null;
  const text = await data.text();
  return JSON.parse(text) as T;
}

// --- Public API ---

export async function getActiveSnapshot(): Promise<Dataset | null> {
  try {
    const supabase = getSupabaseServerClient();
    return await downloadJSON<Dataset>(supabase, DATASET_PATH);
  } catch (err) {
    console.warn("getActiveSnapshot failed:", err);
    return null;
  }
}

export async function replaceSnapshot(dataset: Dataset): Promise<{ meta: DatasetMeta }> {
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);
  await uploadJSON(supabase, DATASET_PATH, dataset);
  await addLogEntry(supabase, {
    timestamp: new Date().toISOString(),
    fileName: dataset.meta.sourceFileName,
    sheetName: dataset.meta.sheetName,
    rowCount: dataset.meta.rowCount,
    mode: "replace",
    totalRowsAfter: dataset.rows.length,
  });
  return { meta: dataset.meta };
}

export async function appendSnapshot(newDataset: Dataset): Promise<{ meta: DatasetMeta; totalRows: number }> {
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);

  const existing = await downloadJSON<Dataset>(supabase, DATASET_PATH);
  const mergedRows: DataRow[] = existing ? [...existing.rows, ...newDataset.rows] : newDataset.rows;

  const mergedMeta: DatasetMeta = {
    importedAtISO: new Date().toISOString(),
    sourceFileName: existing
      ? `${existing.meta.sourceFileName} + ${newDataset.meta.sourceFileName}`
      : newDataset.meta.sourceFileName,
    sheetName: newDataset.meta.sheetName,
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

// --- Upload Logs ---

async function addLogEntry(supabase: ReturnType<typeof getSupabaseServerClient>, entry: UploadLogEntry) {
  try {
    const logs = await downloadJSON<UploadLogEntry[]>(supabase, LOGS_PATH) || [];
    logs.push(entry);
    await uploadJSON(supabase, LOGS_PATH, logs);
  } catch (err) {
    console.warn("Failed to write upload log:", err);
  }
}

export async function getUploadLogs(): Promise<UploadLogEntry[]> {
  try {
    const supabase = getSupabaseServerClient();
    return await downloadJSON<UploadLogEntry[]>(supabase, LOGS_PATH) || [];
  } catch {
    return [];
  }
}
