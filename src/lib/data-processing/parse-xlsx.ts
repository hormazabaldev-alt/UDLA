import * as XLSX from "xlsx";

import { REQUIRED_COLUMNS } from "@/lib/data-processing/columns";
import { normalizeRow } from "@/lib/data-processing/normalize";
import type { Dataset, DataRow, ParseIssue, ParseResult } from "@/lib/data-processing/types";

function getFirstSheet(workbook: XLSX.WorkBook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheetName || !sheet) return null;
  return { sheetName, sheet };
}

function cleanKey(key: string) {
  return key.replace(/\s+/g, " ").trim();
}

function cleanRowKeys(row: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) next[cleanKey(k)] = v;
  return next;
}

function getPresentColumns(rows: Record<string, unknown>[]) {
  const set = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) set.add(k);
  return set;
}

export async function parseXlsxFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: false,
  });
  const first = getFirstSheet(workbook);
  if (!first) {
    return {
      ok: false,
      issues: [{ message: "No se encontró ninguna hoja en el Excel." }],
      preview: [],
    };
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(first.sheet, {
    defval: null,
    raw: true,
  });

  const cleanedRows = rows.map(cleanRowKeys);
  const preview = cleanedRows.slice(0, 25);
  const present = getPresentColumns(cleanedRows);
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));
  const issues: ParseIssue[] = [];

  if (cleanedRows.length === 0) {
    return {
      ok: false,
      issues: [{ message: "El archivo no contiene filas de datos." }],
      preview,
    };
  }

  for (const col of missing) {
    issues.push({ column: col, message: `Falta la columna requerida: ${col}` });
  }

  const normalizedRows: DataRow[] = [];
  for (let i = 0; i < cleanedRows.length; i++) {
    const { row, issues: rowIssues } = normalizeRow(cleanedRows[i]!, i);
    issues.push(...rowIssues);
    if (row) normalizedRows.push(row);
  }

  if (issues.length > 0) {
    return { ok: false, issues, preview };
  }

  const dataset: Dataset = {
    meta: {
      importedAtISO: new Date().toISOString(),
      sourceFileName: file.name,
      sheetName: first.sheetName,
      rowCount: normalizedRows.length,
    },
    rows: normalizedRows,
  };

  return { ok: true, dataset, preview };
}
