import { create } from "zustand";

import type { BaseType, Dataset, NormalizedRow } from "@/lib/data-processing/types";
import { computeTotals, type Totals } from "@/lib/data-processing/metrics";

export type Filters = {
  tipo: BaseType | "All";
  mes: number | "All";
  diaNumero: number | "All";
};

export type DashboardState = {
  dataset: Dataset | null;
  filters: Filters;
  setDataset: (dataset: Dataset | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
};

const DEFAULT_FILTERS: Filters = {
  tipo: "All",
  mes: "All",
  diaNumero: "All",
};

export function applyFilters(rows: NormalizedRow[], filters: Filters): NormalizedRow[] {
  return rows.filter((r) => {
    if (filters.tipo !== "All" && r.tipo !== filters.tipo) return false;
    if (filters.mes !== "All" && r.mes !== filters.mes) return false;
    if (filters.diaNumero !== "All" && r.diaNumero !== filters.diaNumero) return false;
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
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  resetFilters: () => set(() => ({ filters: DEFAULT_FILTERS })),
}));

