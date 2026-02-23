import type { DataRow, ParseIssue } from "@/lib/data-processing/types";
import { parse, isValid, getMonth, getDate, getDay } from "date-fns";

type RawRow = Record<string, unknown>;

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // Try multiple formats
    const formats = [
      "dd-MM-yyyy",
      "dd/MM/yyyy",
      "yyyy-MM-dd",
      "MM/dd/yyyy",
      "dd-MM-yy",
      "dd/MM/yy"
    ];

    for (const fmt of formats) {
      const parsed = parse(s, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }

    // Try native Date parser as last resort
    const fallback = new Date(s);
    if (!Number.isNaN(fallback.getTime())) return fallback;

    // Check if it's a string representation of an Excel serial number
    const num = Number(s);
    if (!Number.isNaN(num) && num > 10000 && num < 100000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (isValid(date)) return date;
    }
  }
  if (typeof value === "number") {
    // Excel serial date handling usually done by XLSX lib if cellDates: true, 
    // but if we get a raw number: (value - 25569) * 86400 * 1000
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (isValid(date)) return date;
  }
  return null;
}

function cleanString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getValue(raw: RawRow, key: string): unknown {
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(raw)) {
    if (k.toLowerCase() === lowerKey) return v;
  }
  return undefined;
}

function getValueAny(raw: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    const v = getValue(raw, key);
    if (v !== undefined) return v;
  }
  return undefined;
}

export function normalizeRow(raw: RawRow, rowIndex: number): {
  row: DataRow | null;
  issues: ParseIssue[];
} {
  const issues: ParseIssue[] = [];

  const tipoLlamada = cleanString(getValue(raw, "Tipo Llamada"));
  const fechaCarga = parseDate(getValue(raw, "Fecha Carga"));
  const rutBase = cleanString(getValue(raw, "Rut Base"));
  const tipoBase = cleanString(getValue(raw, "Tipo Base"));
  const fechaGestion = parseDate(getValue(raw, "Fecha Gestion"));
  const conecta = cleanString(getValue(raw, "Conecta"));
  const interesa = cleanString(getValue(raw, "Interesa"));
  const regimen = cleanString(getValue(raw, "Regimen"));
  const sedeInteres = cleanString(getValue(raw, "Sede Interes"));
  const afCampus = cleanString(getValueAny(raw, ["afcampus", "AF Campus", "AFCampus"]));
  const mcCampus = cleanString(getValueAny(raw, ["mccampus", "MC Campus", "MCCampus"]));
  const semana = cleanString(getValue(raw, "Semana"));
  const af = cleanString(getValue(raw, "AF"));
  const fechaAfRaw = parseDate(getValue(raw, "Fecha af"));
  const mc = cleanString(getValue(raw, "MC"));
  const fechaMcRaw = parseDate(getValue(raw, "Fecha MC"));

  // Reglas: si AF/MC vienen vacíos, sus fechas asociadas deben quedar null.
  const fechaAf = af ? fechaAfRaw : null;
  const fechaMc = mc ? fechaMcRaw : null;

  // Validaciones críticas
  if (!rutBase) {
    issues.push({ rowIndex, column: "Rut Base", message: "RUT faltante" });
  }

  // Si no hay errores bloqueantes, retornamos la fila
  // Nota: Permitimos filas con datos parciales (ej. sin fecha gestión) si cuentan para "Cargada"

  if (!rutBase) return { row: null, issues };

  const row: DataRow = {
    tipoLlamada: tipoLlamada ?? "Desconocido",
    fechaCarga,
    rutBase,
    tipoBase: tipoBase ?? "Desconocido",
    fechaGestion,
    conecta,
    interesa,
    regimen,
    sedeInteres,
    afCampus,
    mcCampus,
    semana,
    af,
    fechaAf,
    mc,
    fechaMc,

    // Computed
    mes: fechaGestion ? getMonth(fechaGestion) + 1 : null, // 1-12
    diaNumero: fechaGestion ? getDate(fechaGestion) : null,
    diaSemana: fechaGestion ? DIAS_SEMANA[getDay(fechaGestion)] : null
  };

  return { row, issues };
}
