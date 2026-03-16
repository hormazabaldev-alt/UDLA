import "server-only";

import { importCsvSnapshot } from "@/lib/data-processing/import-csv-server";
import {
  importXlsxSnapshot,
  type ImportProgressEvent,
  type ServerImportResult,
} from "@/lib/data-processing/import-xlsx-server";

function getFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf(".");
  return lastDot >= 0 ? normalized.slice(lastDot) : "";
}

export type { ImportProgressEvent, ServerImportResult } from "@/lib/data-processing/import-xlsx-server";

export async function importDatasetSnapshot(
  file: File,
  onProgress?: (event: ImportProgressEvent) => Promise<void> | void,
  opts?: { append?: boolean },
): Promise<ServerImportResult> {
  const extension = getFileExtension(file.name);

  if (extension === ".csv") {
    return importCsvSnapshot(file, onProgress, opts);
  }

  if (extension === ".xlsx") {
    return importXlsxSnapshot(file, onProgress, opts);
  }

  throw new Error("Formato no soportado. Sube un archivo .xlsx o .csv.");
}
