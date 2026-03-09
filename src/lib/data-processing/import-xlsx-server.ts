import "server-only";

import * as XLSX from "xlsx";

import { REQUIRED_COLUMNS } from "@/lib/data-processing/columns";
import { buildRowKey } from "@/lib/data-processing/dedupe";
import { normalizeRow } from "@/lib/data-processing/normalize";
import type { DatasetMeta, DataRow, ParseIssue } from "@/lib/data-processing/types";
import {
  abortSnapshotWrite,
  appendSnapshotChunk,
  beginSnapshotWrite,
  finalizeSnapshotWrite,
  type SnapshotWriteSession,
} from "@/lib/supabase/snapshot";

const PROCESS_BATCH_SIZE = 2_000;
const STORAGE_CHUNK_SIZE = 5_000;
const MAX_ISSUES = 100;
const PREVIEW_LIMIT = 25;

type SheetCandidate = {
  sheetName: string;
  sheet: XLSX.WorkSheet;
  range: XLSX.Range;
  headers: string[];
  missing: string[];
  rowCount: number;
  score: number;
};

export type ImportProgressEvent = {
  stage: "received" | "analyzing" | "processing" | "persisting" | "completed";
  message: string;
  processedRows?: number;
  totalRows?: number;
  uploadedChunks?: number;
  totalChunks?: number;
};

export type ServerImportResult =
  | { ok: true; meta: DatasetMeta }
  | { ok: false; issues: ParseIssue[]; preview: Record<string, unknown>[] };

function cleanKey(key: string) {
  return key
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSheetCellValue(sheet: XLSX.WorkSheet, row: number, column: number) {
  if (Array.isArray(sheet)) {
    const denseRow = sheet[row] as XLSX.CellObject[] | undefined;
    return denseRow?.[column]?.v;
  }

  const cellRef = XLSX.utils.encode_cell({ r: row, c: column });
  return sheet[cellRef]?.v;
}

function getSheetHeaders(sheet: XLSX.WorkSheet) {
  const ref = sheet["!ref"];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);
  const headers: string[] = [];

  for (let c = range.s.c; c <= range.e.c; c++) {
    const rawCellValue = getSheetCellValue(sheet, range.s.r, c);
    const rawValue = rawCellValue == null ? "" : String(rawCellValue);
    const cleaned = cleanKey(rawValue);
    headers.push(cleaned || `__EMPTY_${c}`);
  }

  return {
    range,
    headers,
    rowCount: Math.max(0, range.e.r - range.s.r),
  };
}

function scoreSheet(headers: string[], rowCount: number) {
  const present = new Set(headers.filter((header) => !header.startsWith("__EMPTY_")));
  const missing = REQUIRED_COLUMNS.filter((column) => !present.has(column));
  const hasAllRequired = missing.length === 0;

  return {
    missing,
    score: (hasAllRequired ? 1_000_000 : 0) + rowCount,
  };
}

function selectBestSheet(workbook: XLSX.WorkBook): SheetCandidate | null {
  const candidates = workbook.SheetNames
    .map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return null;

      const info = getSheetHeaders(sheet);
      if (!info) return null;

      const scored = scoreSheet(info.headers, info.rowCount);
      return {
        sheetName,
        sheet,
        range: info.range,
        headers: info.headers,
        missing: scored.missing,
        rowCount: info.rowCount,
        score: scored.score,
      };
    })
    .filter((candidate): candidate is SheetCandidate => candidate !== null);

  return candidates.sort((a, b) => b.score - a.score)[0] ?? null;
}

function readSheetChunk(candidate: SheetCandidate, startRow: number, endRow: number) {
  const range = XLSX.utils.encode_range({
    s: { r: startRow, c: candidate.range.s.c },
    e: { r: endRow, c: candidate.range.e.c },
  });

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(candidate.sheet, {
    defval: null,
    raw: true,
    blankrows: false,
    range,
    header: candidate.headers,
  });
}

async function flushChunk(
  session: SnapshotWriteSession,
  rows: DataRow[],
  progress: ImportProgressEvent,
  onProgress?: (event: ImportProgressEvent) => Promise<void> | void,
) {
  if (rows.length === 0) return;

  await appendSnapshotChunk(session, rows);
  rows.length = 0;

  await onProgress?.({
    ...progress,
    stage: "persisting",
    uploadedChunks: session.chunkPaths.length,
    totalChunks:
      progress.totalRows !== undefined
        ? Math.max(1, Math.ceil(progress.totalRows / STORAGE_CHUNK_SIZE))
        : undefined,
  });
}

export async function importXlsxSnapshot(
  file: File,
  onProgress?: (event: ImportProgressEvent) => Promise<void> | void,
): Promise<ServerImportResult> {
  await onProgress?.({
    stage: "received",
    message: `Archivo recibido: ${file.name}`,
  });

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    dense: true,
  });

  await onProgress?.({
    stage: "analyzing",
    message: "Analizando hojas del Excel...",
  });

  const best = selectBestSheet(workbook);
  if (!best) {
    return {
      ok: false,
      issues: [{ message: "No se encontró ninguna hoja en el Excel." }],
      preview: [],
    };
  }

  if (best.rowCount === 0) {
    return {
      ok: false,
      issues: [{ message: "El archivo no contiene filas de datos." }],
      preview: [],
    };
  }

  if (best.missing.length > 0) {
    return {
      ok: false,
      issues: best.missing.map((column) => ({
        column,
        message: `Falta la columna requerida: ${column}`,
      })),
      preview: [],
    };
  }

  const preview: Record<string, unknown>[] = [];
  const issues: ParseIssue[] = [];
  const seen = new Set<string>();
  const storageBuffer: DataRow[] = [];
  let session: SnapshotWriteSession | null = null;
  let processedRows = 0;
  let stoppedByIssues = false;

  try {
    session = await beginSnapshotWrite({
      sourceFileName: file.name,
      sheetName: best.sheetName,
    });

    for (let startRow = best.range.s.r + 1; startRow <= best.range.e.r; startRow += PROCESS_BATCH_SIZE) {
      const endRow = Math.min(best.range.e.r, startRow + PROCESS_BATCH_SIZE - 1);
      const rawRows = readSheetChunk(best, startRow, endRow);

      for (let offset = 0; offset < rawRows.length; offset++) {
        const rawRow = rawRows[offset]!;
        const rowIndex = processedRows + offset;

        if (preview.length < PREVIEW_LIMIT) preview.push(rawRow);

        const normalized = normalizeRow(rawRow, rowIndex);
        if (normalized.issues.length > 0) {
          const available = MAX_ISSUES - issues.length;
          if (available > 0) issues.push(...normalized.issues.slice(0, available));
          if (issues.length >= MAX_ISSUES) {
            stoppedByIssues = true;
            break;
          }
        }

        if (!normalized.row) continue;

        const dedupeKey = buildRowKey(normalized.row);
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        storageBuffer.push(normalized.row);

        if (storageBuffer.length >= STORAGE_CHUNK_SIZE) {
          await flushChunk(
            session,
            storageBuffer,
            {
              stage: "processing",
              message: `Procesando ${Math.min(best.rowCount, rowIndex + 1)} de ${best.rowCount} filas...`,
              processedRows: Math.min(best.rowCount, rowIndex + 1),
              totalRows: best.rowCount,
            },
            onProgress,
          );
        }
      }

      processedRows += rawRows.length;

      await onProgress?.({
        stage: "processing",
        message: `Procesando ${Math.min(best.rowCount, processedRows)} de ${best.rowCount} filas...`,
        processedRows: Math.min(best.rowCount, processedRows),
        totalRows: best.rowCount,
        uploadedChunks: session.chunkPaths.length,
        totalChunks: Math.max(1, Math.ceil(best.rowCount / STORAGE_CHUNK_SIZE)),
      });

      if (stoppedByIssues) break;
    }

    if (issues.length > 0) {
      if (stoppedByIssues) {
        issues.push({
          message: `Se alcanzó el límite de ${MAX_ISSUES} problemas mostrados. Corrige esos errores y vuelve a intentar.`,
        });
      }
      await abortSnapshotWrite(session);
      return { ok: false, issues, preview };
    }

    await flushChunk(
      session,
      storageBuffer,
      {
        stage: "persisting",
        message: "Guardando bloques finales...",
        processedRows: best.rowCount,
        totalRows: best.rowCount,
      },
      onProgress,
    );

    const finalized = await finalizeSnapshotWrite(session);

    await onProgress?.({
      stage: "completed",
      message: `Importación completada: ${finalized.meta.rowCount} filas.`,
      processedRows: best.rowCount,
      totalRows: best.rowCount,
      uploadedChunks: session.chunkPaths.length,
      totalChunks: session.chunkPaths.length,
    });

    return { ok: true, meta: finalized.meta };
  } catch (error) {
    if (session) await abortSnapshotWrite(session);
    throw error;
  }
}
