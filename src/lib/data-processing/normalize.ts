import type { DataRow, ParseIssue } from "@/lib/data-processing/types";
import { parse, isValid, getMonth, getDate, getDay } from "date-fns";
import { toCampusCode } from "@/lib/utils/campus";

type RawRow = Record<string, unknown>;

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;

    // Fast-path: ISO-like (yyyy-MM-dd...)
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]);
      const day = Number(iso[3]);
      const d = new Date(year, month - 1, day);
      if (isValid(d) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
    }

    // Handle ambiguous numeric dates (d/M/yyyy or M/d/yyyy). We default to d/M (CL),
    // but if the second segment is > 12 we treat it as the day (M/d).
    const numeric = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (numeric) {
      const a = Number(numeric[1]);
      const b = Number(numeric[2]);
      let year = Number(numeric[3]);
      if (year < 100) year += 2000;

      let day = a;
      let month = b;
      if (a <= 12 && b > 12) {
        // M/d
        day = b;
        month = a;
      }

      const d = new Date(year, month - 1, day);
      if (isValid(d) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
    }

    // Try multiple formats as fallback (covers textual/edge cases)
    const formats = ["dd-MM-yyyy", "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "dd-MM-yy", "dd/MM/yy", "d/M/yy"];
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
  // Some files may carry the appointment intent under a dedicated "Citas" column.
  // Prefer it when present, fallback to "Interesa".
  const interesa = cleanString(getValueAny(raw, ["Citas", "Cita", "Interesa"]));
  const regimen = cleanString(getValue(raw, "Regimen"));
  const sedeInteresRaw = cleanString(getValue(raw, "Sede Interes"));
  const sedeInteres = sedeInteresRaw ? toCampusCode(sedeInteresRaw) : null;
  const afCampusRaw = cleanString(getValueAny(raw, ["afcampus", "AF Campus", "AFCampus"]));
  const afCampus = afCampusRaw ? toCampusCode(afCampusRaw) : null;
  const mcCampusRaw = cleanString(getValueAny(raw, ["mccampus", "MC Campus", "MCCampus"]));
  const mcCampus = mcCampusRaw ? toCampusCode(mcCampusRaw) : null;
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
