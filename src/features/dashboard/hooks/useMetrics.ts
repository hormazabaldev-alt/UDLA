"use client";

import { useDeferredValue, useMemo } from "react";

import type { Dataset, DataRow } from "@/lib/data-processing/types";
import { applyFilters, useDashboardStore } from "@/store/dashboard-store";
import { matchesTemporalFiltersForAnyMetric } from "@/lib/data-processing/temporal";
import { computeTotals, computeTrend } from "@/lib/data-processing/metrics";

type MetricsResult = {
  rows: DataRow[];
  detailRows: DataRow[];
  totals: ReturnType<typeof computeTotals> | null;
  trend: ReturnType<typeof computeTrend> | null;
  filters: ReturnType<typeof useDashboardStore.getState>["filters"] | null;
};

let lastDataset: Dataset | null = null;
let lastFilters: ReturnType<typeof useDashboardStore.getState>["filters"] | null = null;
let lastTipoIndex: Record<string, DataRow[]> | null = null;
let lastMetricsResult: MetricsResult | null = null;

function getMetricsResult(
  dataset: Dataset | null,
  filters: ReturnType<typeof useDashboardStore.getState>["filters"],
  tipoIndex: Record<string, DataRow[]> | null,
): MetricsResult {
  if (!dataset) {
    return { rows: [], detailRows: [], totals: null, trend: null, filters: null };
  }

  if (lastDataset === dataset && lastFilters === filters && lastTipoIndex === tipoIndex && lastMetricsResult) {
    return lastMetricsResult;
  }

  const rows = applyFilters(dataset.rows, filters, { tipoIndex, includeTemporal: false });
  const detailRows = rows.filter((row) => matchesTemporalFiltersForAnyMetric(row, filters));
  const trendRows = applyFilters(dataset.rows, filters, { tipoIndex });
  const totals = computeTotals(rows, filters);
  const trend = computeTrend(trendRows, { tipoUniverse: filters.tipo.length > 0 ? filters.tipo : undefined });

  lastDataset = dataset;
  lastFilters = filters;
  lastTipoIndex = tipoIndex;
  lastMetricsResult = { rows, detailRows, totals, trend, filters };

  return lastMetricsResult;
}

export function useMetrics() {
  const dataset = useDashboardStore((s) => s.dataset);
  const filters = useDashboardStore((s) => s.filters);
  const tipoIndex = useDashboardStore((s) => s.tipoIndex);

  const metrics = useMemo(
    () => getMetricsResult(dataset, filters, tipoIndex),
    [dataset, filters, tipoIndex],
  );

  return useDeferredValue(metrics);
}
