export type BaseType = "Lead" | "Stock" | "Inbound" | "Outbound" | string;

export type DataRow = {
  // Raw fields
  tipoLlamada: string;
  fechaCarga: Date | null;
  rutBase: string;
  tipoBase: string;
  fechaGestion: Date | null;
  conecta: "Conecta" | "No Conecta" | string | null;
  interesa: string | null;
  regimen: string | null;
  sedeInteres: string | null;
  afCampus: string | null;
  mcCampus: string | null;
  semana: string | null;
  af: string | null; // A, MC, M
  fechaAf: Date | null;
  mc: string | null; // M, MC
  fechaMc: Date | null;

  // Computed/Helper helpers for easy filtering
  mes: number | null; // Derived from Fecha Gestion
  diaNumero: number | null; // Derived from Fecha Gestion
  diaSemana: string | null; // Derived from Fecha Gestion
};

export type DatasetMeta = {
  importedAtISO: string;
  sourceFileName: string;
  sheetName: string;
  rowCount: number;
};

export type Dataset = {
  meta: DatasetMeta;
  rows: DataRow[];
};

export type ParseIssue = {
  rowIndex?: number;
  column?: string;
  message: string;
};

export type ParseResult =
  | { ok: true; dataset: Dataset; preview: Record<string, unknown>[] }
  | { ok: false; issues: ParseIssue[]; preview: Record<string, unknown>[] };
