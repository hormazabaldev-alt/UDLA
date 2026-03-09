import type { DataRow } from "@/lib/data-processing/types";
import { parseLooseDate } from "@/lib/utils/date";
import {
  FECHA_GESTION_PERIOD_END,
  FECHA_GESTION_PERIOD_START,
  resolveSemanaLabel,
} from "@/lib/utils/semana";

export function buildRowKey(row: DataRow): string {
  const iso = (value: unknown) => {
    if (!value) return "";
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return "";
      return value.toISOString();
    }
    if (typeof value === "string") return value;
    if (typeof value === "number") {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return date.toISOString();
    }
    return "";
  };

  const norm = (value: unknown) => String(value ?? "").trim();
  const fechaGestion = parseLooseDate(row.fechaGestion, {
    minDate: FECHA_GESTION_PERIOD_START,
    maxDate: FECHA_GESTION_PERIOD_END,
  });
  const semana = resolveSemanaLabel(fechaGestion, norm(row.semana));

  return [
    norm(row.rutBase),
    norm(row.tipoBase),
    norm(row.tipoLlamada),
    iso(row.fechaCarga),
    iso(row.fechaGestion),
    norm(row.conecta),
    norm(row.interesa),
    norm(row.regimen),
    norm(row.sedeInteres),
    norm(row.afCampus),
    norm(row.mcCampus),
    norm(semana),
    norm(row.af),
    iso(row.fechaAf),
    norm(row.mc),
    iso(row.fechaMc),
  ].join("|");
}

export function dedupeRows(rows: DataRow[]): DataRow[] {
  const seen = new Set<string>();
  const output: DataRow[] = [];

  for (const row of rows) {
    const key = buildRowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(row);
  }

  return output;
}
