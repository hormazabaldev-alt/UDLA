import "server-only";

import { importXlsxDiplomadoSnapshot } from "@/lib/data-processing/import-xlsx-diplomado-server";
import type { ImportProgressEvent, ServerImportResult } from "@/lib/data-processing/import-xlsx-server";

// CSV diplomado: reuses xlsx importer logic but for CSV we inline a minimal version
// using diplomado storage functions.
import Papa from "papaparse";
import { normalizeRow } from "@/lib/data-processing/normalize";
import { REQUIRED_COLUMNS } from "@/lib/data-processing/columns";
import type { DataRow, ParseIssue } from "@/lib/data-processing/types";
import {
  abortDiplomadoSnapshotWrite,
  appendDiplomadoSnapshotChunk,
  beginDiplomadoSnapshotWrite,
  finalizeDiplomadoSnapshotWrite,
  type SnapshotWriteSession,
} from "@/lib/supabase/snapshot-diplomado";

export type { ImportProgressEvent, ServerImportResult };

const PROCESS_BATCH_SIZE = 10_000;
const STORAGE_CHUNK_SIZE = 20_000;
const MAX_ISSUES = 100;
const PREVIEW_LIMIT = 25;
const PROGRESS_STEP = 10_000;

function cleanKey(key: string) {
  return key.replace(/^﻿/, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

async function flushChunk(session: SnapshotWriteSession, rows: DataRow[], progress: ImportProgressEvent, onProgress?: (e: ImportProgressEvent) => Promise<void> | void) {
  if (rows.length === 0) return;
  await appendDiplomadoSnapshotChunk(session, rows);
  rows.length = 0;
  await onProgress?.({ ...progress, stage: "persisting", uploadedChunks: session.chunkPaths.length, totalChunks: progress.totalRows !== undefined ? Math.max(1, Math.ceil(progress.totalRows / STORAGE_CHUNK_SIZE)) : undefined });
}

async function importCsvDiplomadoSnapshot(file: File, onProgress?: (e: ImportProgressEvent) => Promise<void> | void, opts?: { append?: boolean }): Promise<ServerImportResult> {
  await onProgress?.({ stage: "received", message: `Archivo recibido: ${file.name}` });
  const text = await file.text();
  await onProgress?.({ stage: "analyzing", message: "Analizando columnas del CSV..." });

  const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", transformHeader: cleanKey }) as { data: Record<string, unknown>[]; errors: Array<{ row?: number; message: string }>; meta: { fields?: string[] } };

  if (parsed.errors.length > 0) return { ok: false, issues: parsed.errors.slice(0, MAX_ISSUES).map((e) => ({ rowIndex: typeof e.row === "number" ? e.row : undefined, message: e.message })), preview: [] };

  const fields = (parsed.meta.fields ?? []).map(cleanKey);
  const present = new Set(fields);
  const missing = REQUIRED_COLUMNS.filter((col) => !present.has(cleanKey(col)));
  if (missing.length > 0) return { ok: false, issues: missing.map((col) => ({ column: col, message: `Falta la columna requerida: ${col}` })), preview: [] };

  const rawRows = parsed.data as Record<string, unknown>[];
  const preview = rawRows.slice(0, PREVIEW_LIMIT) as Record<string, unknown>[];
  if (rawRows.length === 0) return { ok: false, issues: [{ message: "El archivo no contiene filas de datos." }], preview };

  const issues: ParseIssue[] = [];
  const storageBuffer: DataRow[] = [];
  let session: SnapshotWriteSession | null = null;
  let nextProgressAt = PROGRESS_STEP;
  let stoppedByIssues = false;

  try {
    session = await beginDiplomadoSnapshotWrite({ sourceFileName: file.name, sheetName: "CSV", append: opts?.append });

    for (let batchStart = 0; batchStart < rawRows.length; batchStart += PROCESS_BATCH_SIZE) {
      const batch = rawRows.slice(batchStart, batchStart + PROCESS_BATCH_SIZE);
      for (let offset = 0; offset < batch.length; offset++) {
        const rowIndex = batchStart + offset;
        const normalized = normalizeRow(batch[offset] as Record<string, unknown>, rowIndex);
        if (normalized.issues.length > 0) {
          const available = MAX_ISSUES - issues.length;
          if (available > 0) issues.push(...normalized.issues.slice(0, available));
          if (issues.length >= MAX_ISSUES) { stoppedByIssues = true; break; }
        }
        if (!normalized.row) continue;
        storageBuffer.push(normalized.row);
        const processedRows = Math.min(rawRows.length, rowIndex + 1);
        if (processedRows >= nextProgressAt) {
          await onProgress?.({ stage: "processing", message: `Procesando ${processedRows} de ${rawRows.length} filas...`, processedRows, totalRows: rawRows.length, uploadedChunks: session.chunkPaths.length, totalChunks: Math.max(1, Math.ceil(rawRows.length / STORAGE_CHUNK_SIZE)) });
          nextProgressAt += PROGRESS_STEP;
        }
        if (storageBuffer.length >= STORAGE_CHUNK_SIZE) {
          await flushChunk(session, storageBuffer, { stage: "processing", message: `Procesando ${processedRows} de ${rawRows.length} filas...`, processedRows, totalRows: rawRows.length }, onProgress);
        }
      }
      if (stoppedByIssues) break;
    }

    if (issues.length > 0) {
      if (stoppedByIssues) issues.push({ message: `Se alcanzó el límite de ${MAX_ISSUES} problemas. Corrige esos errores y vuelve a intentar.` });
      await abortDiplomadoSnapshotWrite(session);
      return { ok: false, issues, preview };
    }

    await flushChunk(session, storageBuffer, { stage: "persisting", message: "Guardando bloques finales...", processedRows: rawRows.length, totalRows: rawRows.length }, onProgress);
    await onProgress?.({ stage: "processing", message: `Procesando ${rawRows.length} de ${rawRows.length} filas...`, processedRows: rawRows.length, totalRows: rawRows.length, uploadedChunks: session.chunkPaths.length, totalChunks: Math.max(1, Math.ceil(rawRows.length / STORAGE_CHUNK_SIZE)) });

    const finalized = await finalizeDiplomadoSnapshotWrite(session);
    await onProgress?.({ stage: "completed", message: `Importación completada: ${finalized.meta.rowCount} filas.`, processedRows: rawRows.length, totalRows: rawRows.length, uploadedChunks: session.chunkPaths.length, totalChunks: session.chunkPaths.length });

    return { ok: true, meta: finalized.meta };
  } catch (error) {
    if (session) await abortDiplomadoSnapshotWrite(session);
    throw error;
  }
}

function getFileExtension(fileName: string) {
  const n = fileName.trim().toLowerCase();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i) : "";
}

export async function importDiplomadoDatasetSnapshot(
  file: File,
  onProgress?: (event: ImportProgressEvent) => Promise<void> | void,
  opts?: { append?: boolean },
): Promise<ServerImportResult> {
  const ext = getFileExtension(file.name);
  if (ext === ".csv") return importCsvDiplomadoSnapshot(file, onProgress, opts);
  if (ext === ".xlsx") return importXlsxDiplomadoSnapshot(file, onProgress, opts);
  throw new Error("Formato no soportado. Sube un archivo .xlsx o .csv.");
}
