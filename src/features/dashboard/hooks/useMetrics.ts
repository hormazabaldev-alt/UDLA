"use client";

import { useMemo } from "react";

import { applyFilters, useDashboardStore } from "@/store/dashboard-store";
import { computeTotals } from "@/lib/data-processing/metrics";

export function useMetrics() {
  const dataset = useDashboardStore((s) => s.dataset);
  const filters = useDashboardStore((s) => s.filters);

  return useMemo(() => {
    if (!dataset) return { rows: [], totals: null };
    const rows = applyFilters(dataset.rows, filters);
    const totals = computeTotals(rows);
    return { rows, totals };
  }, [dataset, filters]);
}
