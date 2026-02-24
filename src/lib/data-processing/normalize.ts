import type { DataRow, ParseIssue } from "@/lib/data-processing/types";
import { endOfMonth, getMonth, getDate, getDay } from "date-fns";
import { toCampusCode } from "@/lib/utils/campus";
import { parseLooseDate } from "@/lib/utils/date";

type RawRow = Record<string, unknown>;

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

  const periodStart = new Date(2025, 7, 1); // 2025-08-01
  const periodEnd = endOfMonth(new Date()); // clamp to current month

  const tipoLlamada = cleanString(getValue(raw, "Tipo Llamada"));
  const fechaCarga = parseLooseDate(getValue(raw, "Fecha Carga"));
  const rutBase = cleanString(getValue(raw, "Rut Base"));
  const tipoBase = cleanString(getValue(raw, "Tipo Base"));
  const fechaGestion = parseLooseDate(getValue(raw, "Fecha Gestion"), { minDate: periodStart, maxDate: periodEnd });
  const conecta = cleanString(getValue(raw, "Conecta"));
  // Some files may carry the appointment intent under a dedicated "Citas" column.
  // Prefer it when present, fallback to "Interesa".
  // Common variants: "Citas Presente", "Citas presente".
  const interesa = cleanString(getValueAny(raw, ["Citas Presente", "Citas", "Cita", "Interesa"]));
  const regimen = cleanString(getValue(raw, "Regimen"));
  const sedeInteresRaw = cleanString(getValue(raw, "Sede Interes"));
  const sedeInteres = sedeInteresRaw ? toCampusCode(sedeInteresRaw) : null;
  const afCampusRaw = cleanString(getValueAny(raw, ["afcampus", "AF Campus", "AFCampus"]));
  const afCampus = afCampusRaw ? toCampusCode(afCampusRaw) : null;
  const mcCampusRaw = cleanString(getValueAny(raw, ["mccampus", "MC Campus", "MCCampus"]));
  const mcCampus = mcCampusRaw ? toCampusCode(mcCampusRaw) : null;
  const semana = cleanString(getValue(raw, "Semana"));
  const af = cleanString(getValue(raw, "AF"));
  const fechaAfRaw = parseLooseDate(getValue(raw, "Fecha af"));
  const mc = cleanString(getValue(raw, "MC"));
  const fechaMcRaw = parseLooseDate(getValue(raw, "Fecha MC"));

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
