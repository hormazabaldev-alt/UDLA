import type { BaseType, NormalizedRow, ParseIssue } from "@/lib/data-processing/types";
import { toFiniteNumber, toPercent } from "@/lib/utils/number";

type RawRow = Record<string, unknown>;

function normalizeTipo(value: unknown): BaseType | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "stock") return "Stock";
  if (v === "web") return "Web";
  return null;
}

function toNonNegativeInt(value: unknown): number | null {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  if (n < 0) return null;
  return Math.round(n);
}

export function normalizeRow(raw: RawRow, rowIndex: number): {
  row: NormalizedRow | null;
  issues: ParseIssue[];
} {
  const issues: ParseIssue[] = [];

  const tipo = normalizeTipo(raw["Tipo"]);
  if (!tipo) issues.push({ rowIndex, column: "Tipo", message: "Tipo inválido" });

  const diaLabel =
    typeof raw["Día"] === "string" && raw["Día"].trim() ? raw["Día"].trim() : null;
  const mes = toNonNegativeInt(raw["Mes"]);
  const diaNumero = toNonNegativeInt(raw["Día numérico"]);

  const cargada = toNonNegativeInt(raw["Cargada"]);
  const recorrido = toNonNegativeInt(raw["Recorrido"]);
  const contactado = toNonNegativeInt(raw["Contactado"]);
  const citas = toNonNegativeInt(raw["Citas"]);
  const af = toNonNegativeInt(raw["AF"]);
  const mc = toNonNegativeInt(raw["MC"]);

  const requiredNumbers = [
    ["Cargada", cargada],
    ["Recorrido", recorrido],
    ["Contactado", contactado],
    ["Citas", citas],
    ["AF", af],
    ["MC", mc],
  ] as const;

  for (const [col, val] of requiredNumbers) {
    if (val === null) issues.push({ rowIndex, column: col, message: "Número inválido" });
  }

  const pctContactabilidadFile = toPercent(raw["% Contactabilidad"]);
  const pctEfectividadFile = toPercent(raw["% Efectividad"]);
  const tcAfFile = toPercent(raw["Tc% AF / Citas"]);
  const tcMcFile = toPercent(raw["Tc% MC / Citas"]);

  if (!tipo || cargada === null || recorrido === null || contactado === null || citas === null || af === null || mc === null) {
    return { row: null, issues };
  }

  const pctContactabilidadComputed =
    recorrido > 0 ? contactado / recorrido : null;
  const pctEfectividadComputed = citas > 0 ? (af + mc) / citas : null;
  const tcAfComputed = citas > 0 ? af / citas : null;
  const tcMcComputed = citas > 0 ? mc / citas : null;

  const row: NormalizedRow = {
    tipo,
    diaLabel,
    mes: mes ?? null,
    diaNumero: diaNumero ?? null,
    cargada,
    recorrido,
    contactado,
    citas,
    af,
    mc,
    pctContactabilidad:
      pctContactabilidadFile ?? pctContactabilidadComputed,
    pctEfectividad: pctEfectividadFile ?? pctEfectividadComputed,
    tcAf: tcAfFile ?? tcAfComputed,
    tcMc: tcMcFile ?? tcMcComputed,
  };

  return { row, issues };
}

