"use client";

import { useMemo } from "react";

import { applyFilters, useDashboardStore } from "@/store/dashboard-store";
import { computeTotals, computeTrend } from "@/lib/data-processing/metrics";

export function useMetrics() {
  const dataset = useDashboardStore((s) => s.dataset);
  const filters = useDashboardStore((s) => s.filters);
  const tipoIndex = useDashboardStore((s) => s.tipoIndex);

  return useMemo(() => {
    if (!dataset) return { rows: [], totals: null, trend: null };
    const rows = applyFilters(dataset.rows, filters, { tipoIndex });
    const totals = computeTotals(rows);
    const trend = computeTrend(rows, { tipoUniverse: filters.tipo.length > 0 ? filters.tipo : undefined });
    return { rows, totals, trend };
  }, [dataset, filters, tipoIndex]);
}
