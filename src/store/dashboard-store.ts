import { create } from "zustand";

import type { BaseType, Dataset, DataRow } from "@/lib/data-processing/types";
import { computeTotals, type Totals } from "@/lib/data-processing/metrics";
import { toCampusCode } from "@/lib/utils/campus";

export type Filters = {
  tipo: BaseType[];
  mes: number[];
  diaNumero: number[];
  semanas: string[];
  campus: string[];
  regimen: string[];
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
  tipo: [],
  mes: [],
  diaNumero: [],
  semanas: [],
  campus: [],
  regimen: [],
};

export function applyFilters(rows: DataRow[], filters: Filters): DataRow[] {
  return rows.filter((r) => {
    if (filters.tipo.length > 0 && r.tipoBase && !filters.tipo.includes(r.tipoBase)) return false;
    if (filters.mes.length > 0 && r.mes && !filters.mes.includes(r.mes)) return false;
    if (filters.diaNumero.length > 0 && r.diaNumero && !filters.diaNumero.includes(r.diaNumero)) return false;

    if (filters.semanas.length > 0) {
      const semana = r.semana ?? "";
      if (!filters.semanas.includes(semana)) return false;
    }

    if (filters.campus.length > 0) {
      const campus = toCampusCode(r.sedeInteres ?? "");
      if (!filters.campus.includes(campus)) return false;
    }

    if (filters.regimen.length > 0) {
      const regimen = r.regimen ?? "";
      if (!filters.regimen.includes(regimen)) return false;
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
