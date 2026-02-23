import { create } from "zustand";

import type { BaseType, Dataset, DataRow } from "@/lib/data-processing/types";
import { computeTotals, type Totals } from "@/lib/data-processing/metrics";
import { toCampusCode } from "@/lib/utils/campus";

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

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
  tipoIndex: Record<string, DataRow[]> | null;
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

export function applyFilters(
  rows: DataRow[],
  filters: Filters,
  opts?: { tipoIndex?: Record<string, DataRow[]> | null },
): DataRow[] {
  let baseRows = rows;

  if (filters.tipo.length > 0 && opts?.tipoIndex) {
    const indexed: DataRow[] = [];
    for (const tipo of filters.tipo) {
      const bucket = opts.tipoIndex[tipo];
      if (bucket) indexed.push(...bucket);
    }
    baseRows = indexed;
  }

  return baseRows.filter((r) => {
    if (filters.tipo.length > 0 && !filters.tipo.includes(r.tipoBase)) return false;
    if (filters.mes.length > 0) {
      if (!isValidDate(r.fechaGestion)) return false;
      const month = r.fechaGestion.getMonth() + 1;
      if (!filters.mes.includes(month)) return false;
    }
    if (filters.diaNumero.length > 0) {
      if (!isValidDate(r.fechaGestion)) return false;
      const day = r.fechaGestion.getDate();
      if (!filters.diaNumero.includes(day)) return false;
    }

    if (filters.semanas.length > 0) {
      const semana = (r.semana ?? "").trim();
      if (!semana) return false;
      if (!filters.semanas.includes(semana)) return false;
    }

    if (filters.campus.length > 0) {
      const campus = toCampusCode(r.sedeInteres ?? "");
      if (!campus) return false;
      if (!filters.campus.includes(campus)) return false;
    }

    if (filters.regimen.length > 0) {
      const regimen = (r.regimen ?? "").trim();
      if (!regimen) return false;
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
  tipoIndex: null,
  filters: DEFAULT_FILTERS,
  setDataset: (dataset) =>
    set(() => ({
      dataset,
      tipoIndex: dataset
        ? dataset.rows.reduce<Record<string, DataRow[]>>((acc, r) => {
          const key = r.tipoBase ?? "Desconocido";
          (acc[key] ||= []).push(r);
          return acc;
        }, {})
        : null,
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
