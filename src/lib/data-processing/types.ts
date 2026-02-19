export type BaseType = "Stock" | "Web";

export type NormalizedRow = {
  tipo: BaseType;
  diaLabel: string | null;
  mes: number | null;
  diaNumero: number | null;

  cargada: number;
  recorrido: number;
  contactado: number;
  citas: number;
  af: number;
  mc: number;

  pctContactabilidad: number | null; // 0..1
  pctEfectividad: number | null; // 0..1
  tcAf: number | null; // 0..1
  tcMc: number | null; // 0..1
};

export type DatasetMeta = {
  importedAtISO: string;
  sourceFileName: string;
  sheetName: string;
  rowCount: number;
};

export type Dataset = {
  meta: DatasetMeta;
  rows: NormalizedRow[];
};

export type ParseIssue = {
  rowIndex?: number; // 0-based in data (excluding header)
  column?: string;
  message: string;
};

export type ParseResult =
  | { ok: true; dataset: Dataset; preview: Record<string, unknown>[] }
  | { ok: false; issues: ParseIssue[]; preview: Record<string, unknown>[] };

