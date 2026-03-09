import { getDate, getDay, getMonth } from "date-fns";

import type { DataRow } from "@/lib/data-processing/types";
import { getSemanaCorrelativaLabel } from "@/lib/utils/semana";

export type TemporalFilters = {
  mes: number[];
  diaNumero: number[];
  semanas: string[];
};

export type MetricKey = "cargada" | "recorrido" | "contactado" | "citas" | "af" | "mc";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function hasTemporalFilters(filters: TemporalFilters | null | undefined) {
  if (!filters) return false;
  return filters.mes.length > 0 || filters.diaNumero.length > 0 || filters.semanas.length > 0;
}

export function getMetricDate(row: DataRow, metric: MetricKey): Date | null {
  switch (metric) {
    case "af":
      return isValidDate(row.fechaAf) ? row.fechaAf : null;
    case "mc":
      return isValidDate(row.fechaMc) ? row.fechaMc : null;
    default:
      return isValidDate(row.fechaGestion) ? row.fechaGestion : null;
  }
}

export function getMetricMonth(row: DataRow, metric: MetricKey): number | null {
  const date = getMetricDate(row, metric);
  return date ? getMonth(date) + 1 : null;
}

export function getMetricDayNumber(row: DataRow, metric: MetricKey): number | null {
  const date = getMetricDate(row, metric);
  return date ? getDate(date) : null;
}

export function getMetricDayLabel(row: DataRow, metric: MetricKey): string | null {
  const date = getMetricDate(row, metric);
  return date ? DIAS_SEMANA[getDay(date)] ?? null : null;
}

export function getMetricWeekLabel(row: DataRow, metric: MetricKey): string | null {
  const date = getMetricDate(row, metric);
  return date ? getSemanaCorrelativaLabel(date) : null;
}

export function matchesTemporalFiltersForMetric(
  row: DataRow,
  filters: TemporalFilters | null | undefined,
  metric: MetricKey,
) {
  if (!hasTemporalFilters(filters)) return true;

  const month = getMetricMonth(row, metric);
  const day = getMetricDayNumber(row, metric);
  const week = getMetricWeekLabel(row, metric);

  if (filters && filters.mes.length > 0) {
    if (month === null || !filters.mes.includes(month)) return false;
  }

  if (filters && filters.diaNumero.length > 0) {
    if (day === null || !filters.diaNumero.includes(day)) return false;
  }

  if (filters && filters.semanas.length > 0) {
    if (!week || !filters.semanas.includes(week)) return false;
  }

  return true;
}

export function matchesTemporalFiltersForAnyMetric(
  row: DataRow,
  filters: TemporalFilters | null | undefined,
) {
  if (!hasTemporalFilters(filters)) return true;

  return (
    matchesTemporalFiltersForMetric(row, filters, "cargada")
    || matchesTemporalFiltersForMetric(row, filters, "af")
    || matchesTemporalFiltersForMetric(row, filters, "mc")
  );
}
