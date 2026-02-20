import { create } from "zustand";

import type { BaseType, Dataset, DataRow } from "@/lib/data-processing/types";
import { computeTotals, type Totals } from "@/lib/data-processing/metrics";

export type Filters = {
  tipo: BaseType | "All";
  mes: number | "All";
  diaNumero: number | "All";
  semanas: string[]; // multi-select
};

export type DashboardState = {
  dataset: Dataset | null;
  filters: Filters;
  comparisonMode: "week" | "day";
  currentView: "overview" | "analytics" | "reports" | "live";
  widgetOrder: string[];
  setDataset: (dataset: Dataset | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setComparisonMode: (mode: "week" | "day") => void;
  setCurrentView: (view: "overview" | "analytics" | "reports" | "live") => void;
  setWidgetOrder: (order: string[]) => void;
  resetFilters: () => void;
};

const DEFAULT_FILTERS: Filters = {
  tipo: "All",
  mes: "All",
  diaNumero: "All",
  semanas: [],
};

export function applyFilters(rows: DataRow[], filters: Filters): DataRow[] {
  return rows.filter((r) => {
    // Tipo Base filtering (assuming 'tipo' in filter maps to 'tipoBase' in row)
    // The previous code had 'tipo' in NormalizedRow. The new one has 'tipoBase'.
    if (filters.tipo !== "All" && r.tipoBase !== filters.tipo) return false;
    if (filters.mes !== "All" && r.mes !== filters.mes) return false;
    if (filters.diaNumero !== "All" && r.diaNumero !== filters.diaNumero) return false;
    if (filters.semanas.length > 0) {
      const semana = r.semana ?? "";
      if (!filters.semanas.includes(semana)) return false;
    }
    return true;
  });
}

export function computeFilteredTotals(dataset: Dataset | null, filters: Filters): Totals | null {
  if (!dataset) return null;
  const filtered = applyFilters(dataset.rows, filters);
  return computeTotals(filtered);
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dataset: null,
  filters: DEFAULT_FILTERS,
  setDataset: (dataset) =>
    set(() => ({
      dataset,
      filters: DEFAULT_FILTERS,
    })),
  comparisonMode: "week",
  currentView: "overview", // Default view
  widgetOrder: ["kpi-1", "kpi-2", "kpi-3", "kpi-4", "chart-main", "gauge-group", "funnel", "table"],
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setComparisonMode: (mode) => set(() => ({ comparisonMode: mode })),
  setCurrentView: (view) => set(() => ({ currentView: view })),
  setWidgetOrder: (order) => set(() => ({ widgetOrder: order })),
  resetFilters: () => set(() => ({ filters: DEFAULT_FILTERS })),
}));
