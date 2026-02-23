import * as XLSX from "xlsx";

import { REQUIRED_COLUMNS } from "@/lib/data-processing/columns";
import { normalizeRow } from "@/lib/data-processing/normalize";
import type { Dataset, DataRow, ParseIssue, ParseResult } from "@/lib/data-processing/types";

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

function scoreSheet(present: Set<string>, rowCount: number) {
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));
  const hasAllRequired = missing.length === 0;
  return {
    missing,
    hasAllRequired,
    // Prefer sheets that match required columns, then largest.
    score: (hasAllRequired ? 1_000_000 : 0) + rowCount,
  };
}

export async function parseXlsxFile(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    // Keep actual Date objects for date cells to avoid locale/2-digit-year formatting issues.
    cellDates: true,
  });

  const issues: ParseIssue[] = [];

  const candidates = workbook.SheetNames
    .map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return null;

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
        // Keep raw types (Date/number/string). We normalize downstream.
        raw: true,
      });
      const cleanedRows = rows.map(cleanRowKeys);
      const present = getPresentColumns(cleanedRows);
      const scored = scoreSheet(present, cleanedRows.length);

      return {
        sheetName,
        sheet,
        cleanedRows,
        present,
        missing: scored.missing,
        score: scored.score,
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  const best = candidates.sort((a, b) => b.score - a.score)[0] ?? null;

  if (!best) {
    return {
      ok: false,
      issues: [{ message: "No se encontró ninguna hoja en el Excel." }],
      preview: [],
    };
  }

  const cleanedRows = best.cleanedRows;
  const preview = cleanedRows.slice(0, 25);

  if (cleanedRows.length === 0) {
    return {
      ok: false,
      issues: [{ message: "El archivo no contiene filas de datos." }],
      preview,
    };
  }

  for (const col of best.missing) {
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
      sheetName: best.sheetName,
      rowCount: normalizedRows.length,
    },
    rows: normalizedRows,
  };

  return { ok: true, dataset, preview };
}
