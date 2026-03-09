import "server-only";

import type { Dataset, DatasetMeta, DataRow } from "@/lib/data-processing/types";
import { dedupeRows } from "@/lib/data-processing/dedupe";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "snapshots";
const DATASET_PATH = "active/dataset.json";
const MANIFEST_PATH = "active/manifest.json";
const LOGS_PATH = "logs/upload-log.json";
const DEFAULT_CHUNK_SIZE = 5_000;
const TEMP_UPLOAD_PREFIX = "uploads";
const TEMP_UPLOAD_CHUNK_SIZE = 3 * 1024 * 1024;

type StoredDatasetManifest = {
  version: string;
  meta: DatasetMeta;
  chunkPaths: string[];
  chunkSize: number;
};

export type UploadLogEntry = {
  timestamp: string;
  fileName: string;
  sheetName: string;
  rowCount: number;
  mode: "replace" | "append";
  totalRowsAfter: number;
};

export type SnapshotWriteSession = {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  version: string;
  importedAtISO: string;
  sourceFileName: string;
  sheetName: string;
  rowCount: number;
  chunkPaths: string[];
  nextChunkIndex: number;
};

type TempUploadSession = {
  uploadId: string;
  fileName: string;
  createdAtISO: string;
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
  await uploadBlob(supabase, path, blob, "application/json");
}

async function uploadBlob(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  path: string,
  blob: Blob,
  contentType: string,
) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { statusCode?: number; message?: string };
  if (anyErr.statusCode === 404) return true;
  const message = String(anyErr.message ?? "");
  return message.toLowerCase().includes("not found") || message.toLowerCase().includes("object not found");
}

async function downloadJSONOptional<T>(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  path: string,
  { retries = 0 }: { retries?: number } = {},
): Promise<T | null> {
  let attempt = 0;

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

async function removeFilesOptional(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  paths: string[],
) {
  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    console.warn("Storage cleanup failed:", error.message);
  }
}

function buildChunkPath(version: string, chunkIndex: number) {
  return `versions/${version}/chunk-${String(chunkIndex).padStart(5, "0")}.json`;
}

async function readChunk(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  path: string,
): Promise<DataRow[]> {
  return (await downloadJSONOptional<DataRow[]>(supabase, path, { retries: 2 })) ?? [];
}

async function readManifest(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<StoredDatasetManifest | null> {
  return downloadJSONOptional<StoredDatasetManifest>(supabase, MANIFEST_PATH, { retries: 2 });
}

async function cleanupLegacyActiveDataset(supabase: ReturnType<typeof getSupabaseServerClient>) {
  await removeFilesOptional(supabase, [DATASET_PATH]);
}

function buildTempUploadSessionPath(uploadId: string) {
  return `${TEMP_UPLOAD_PREFIX}/${uploadId}/session.json`;
}

function buildTempUploadChunkPath(uploadId: string, partNumber: number) {
  return `${TEMP_UPLOAD_PREFIX}/${uploadId}/part-${String(partNumber).padStart(6, "0")}.bin`;
}

async function listFolderPaths(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  folder: string,
) {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 1_000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    console.warn("Storage list failed:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((entry) => entry.name !== ".emptyFolderPlaceholder")
    .map((entry) => `${folder}/${entry.name}`);
}

export async function getActiveSnapshot(): Promise<Dataset | null> {
  try {
    const supabase = getSupabaseServerClient();
    const manifest = await readManifest(supabase);

    if (manifest) {
      const rows: DataRow[] = [];
      for (const chunkPath of manifest.chunkPaths) {
        const chunkRows = await readChunk(supabase, chunkPath);
        rows.push(...chunkRows);
      }

      return {
        meta: manifest.meta,
        rows,
      };
    }

    return await downloadJSONOptional<Dataset>(supabase, DATASET_PATH);
  } catch (error) {
    console.warn("getActiveSnapshot failed:", error);
    return null;
  }
}

export function getTempUploadChunkSize() {
  return TEMP_UPLOAD_CHUNK_SIZE;
}

export async function beginTempUpload(fileName: string) {
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);

  const uploadId = crypto.randomUUID();
  const session: TempUploadSession = {
    uploadId,
    fileName,
    createdAtISO: new Date().toISOString(),
  };

  await uploadJSON(supabase, buildTempUploadSessionPath(uploadId), session);

  return {
    uploadId,
    chunkSize: TEMP_UPLOAD_CHUNK_SIZE,
  };
}

export async function storeTempUploadChunk(uploadId: string, partNumber: number, chunk: Uint8Array) {
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);
  const chunkBuffer = new Uint8Array(chunk).buffer;

  await uploadBlob(
    supabase,
    buildTempUploadChunkPath(uploadId, partNumber),
    new Blob([chunkBuffer], { type: "application/octet-stream" }),
    "application/octet-stream",
  );
}

export async function assembleTempUploadFile(uploadId: string, fileName: string, totalChunks: number) {
  const supabase = getSupabaseServerClient();
  const session = await downloadJSONOptional<TempUploadSession>(supabase, buildTempUploadSessionPath(uploadId), {
    retries: 1,
  });

  if (!session) {
    throw new Error("No existe una sesion de carga activa para este archivo.");
  }

  const parts: ArrayBuffer[] = [];
  for (let partNumber = 0; partNumber < totalChunks; partNumber++) {
    const { data, error } = await supabase.storage.from(BUCKET).download(buildTempUploadChunkPath(uploadId, partNumber));
    if (error) {
      throw new Error(`Falta el bloque ${partNumber + 1} del archivo temporal.`);
    }

    parts.push(await data.arrayBuffer());
  }

  return new File(parts, fileName || session.fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function cleanupTempUpload(uploadId: string) {
  const supabase = getSupabaseServerClient();
  const folder = `${TEMP_UPLOAD_PREFIX}/${uploadId}`;
  const paths = await listFolderPaths(supabase, folder);
  await removeFilesOptional(supabase, paths);
}

export async function beginSnapshotWrite(meta: {
  sourceFileName: string;
  sheetName: string;
  importedAtISO?: string;
}): Promise<SnapshotWriteSession> {
  const supabase = getSupabaseServerClient();
  await ensureBucket(supabase);

  return {
    supabase,
    version: crypto.randomUUID(),
    importedAtISO: meta.importedAtISO ?? new Date().toISOString(),
    sourceFileName: meta.sourceFileName,
    sheetName: meta.sheetName,
    rowCount: 0,
    chunkPaths: [],
    nextChunkIndex: 0,
  };
}

export async function appendSnapshotChunk(session: SnapshotWriteSession, rows: DataRow[]) {
  if (rows.length === 0) return;

  const path = buildChunkPath(session.version, session.nextChunkIndex);
  session.nextChunkIndex += 1;
  session.rowCount += rows.length;
  session.chunkPaths.push(path);

  await uploadJSON(session.supabase, path, rows);
}

export async function finalizeSnapshotWrite(session: SnapshotWriteSession): Promise<{ meta: DatasetMeta }> {
  const nextMeta: DatasetMeta = {
    importedAtISO: session.importedAtISO,
    sourceFileName: session.sourceFileName,
    sheetName: session.sheetName,
    rowCount: session.rowCount,
  };

  const previousManifest = await readManifest(session.supabase);
  const manifest: StoredDatasetManifest = {
    version: session.version,
    meta: nextMeta,
    chunkPaths: session.chunkPaths,
    chunkSize: DEFAULT_CHUNK_SIZE,
  };

  await uploadJSON(session.supabase, MANIFEST_PATH, manifest);
  await cleanupLegacyActiveDataset(session.supabase);

  if (previousManifest && previousManifest.version !== session.version) {
    await removeFilesOptional(session.supabase, previousManifest.chunkPaths);
  }

  await addLogEntry(session.supabase, {
    timestamp: new Date().toISOString(),
    fileName: nextMeta.sourceFileName,
    sheetName: nextMeta.sheetName,
    rowCount: nextMeta.rowCount,
    mode: "replace",
    totalRowsAfter: nextMeta.rowCount,
  });

  return { meta: nextMeta };
}

export async function abortSnapshotWrite(session: SnapshotWriteSession) {
  await removeFilesOptional(session.supabase, session.chunkPaths);
}

export async function replaceSnapshot(dataset: Dataset): Promise<{ meta: DatasetMeta }> {
  const dedupedRows = dedupeRows(dataset.rows);
  const session = await beginSnapshotWrite({
    sourceFileName: dataset.meta.sourceFileName,
    sheetName: dataset.meta.sheetName,
  });

  try {
    for (let index = 0; index < dedupedRows.length; index += DEFAULT_CHUNK_SIZE) {
      await appendSnapshotChunk(session, dedupedRows.slice(index, index + DEFAULT_CHUNK_SIZE));
    }

    return await finalizeSnapshotWrite(session);
  } catch (error) {
    await abortSnapshotWrite(session);
    throw error;
  }
}

async function addLogEntry(supabase: ReturnType<typeof getSupabaseServerClient>, entry: UploadLogEntry) {
  try {
    const logs = (await downloadJSONOptional<UploadLogEntry[]>(supabase, LOGS_PATH)) || [];
    logs.push(entry);
    await uploadJSON(supabase, LOGS_PATH, logs);
  } catch (error) {
    console.warn("Failed to write upload log:", error);
  }
}

export async function getUploadLogs(): Promise<UploadLogEntry[]> {
  try {
    const supabase = getSupabaseServerClient();
    return (await downloadJSONOptional<UploadLogEntry[]>(supabase, LOGS_PATH)) || [];
  } catch {
    return [];
  }
}
