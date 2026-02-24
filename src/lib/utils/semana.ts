import { differenceInCalendarWeeks, endOfMonth, startOfWeek } from "date-fns";

const WEEK_STARTS_ON = 1 as const; // Monday

// Ventana operativa solicitada por negocio:
// periodo inicia en agosto 2025 y debe continuar hasta agosto 2026.
export const FECHA_GESTION_PERIOD_START = new Date(2025, 7, 1); // 2025-08-01
export const FECHA_GESTION_PERIOD_END = endOfMonth(new Date(2026, 7, 1)); // 2026-08-31

// Correlativo semanal oficial (archivo referencia): Semana 1 comienza el 2025-08-11.
export const SEMANA_CORRELATIVA_START = new Date(2025, 7, 11); // 2025-08-11

export function parseSemanaNumber(value: string | null | undefined): number | null {
  const s = value?.trim() ?? "";
  if (!s) return null;
  const m = s.match(/(\d+)/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatSemanaLabel(weekNumber: number): string {
  return `Semana ${weekNumber}`;
}

export function getSemanaCorrelativaNumber(fechaGestion: Date | null | undefined): number | null {
  if (!(fechaGestion instanceof Date) || Number.isNaN(fechaGestion.getTime())) return null;

  const weekStart = startOfWeek(fechaGestion, { weekStartsOn: WEEK_STARTS_ON });
  const baseWeekStart = startOfWeek(SEMANA_CORRELATIVA_START, { weekStartsOn: WEEK_STARTS_ON });
  const diff = differenceInCalendarWeeks(weekStart, baseWeekStart, {
    weekStartsOn: WEEK_STARTS_ON,
  });
  if (diff < 0) return null;
  return diff + 1;
}

export function getSemanaCorrelativaLabel(fechaGestion: Date | null | undefined): string | null {
  const weekNumber = getSemanaCorrelativaNumber(fechaGestion);
  return weekNumber ? formatSemanaLabel(weekNumber) : null;
}

export function resolveSemanaLabel(
  fechaGestion: Date | null | undefined,
  rawSemana?: string | null,
): string | null {
  const fromFecha = getSemanaCorrelativaLabel(fechaGestion);
  if (fromFecha) return fromFecha;
  const fallback = rawSemana?.trim() ?? "";
  return fallback.length > 0 ? fallback : null;
}

export function compareSemanaLabels(a: string, b: string): number {
  const na = parseSemanaNumber(a);
  const nb = parseSemanaNumber(b);

  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;

  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}
