"use client";

import { useMemo } from "react";

import type { Filters } from "@/store/dashboard-store";
import { useDashboardStore } from "@/store/dashboard-store";

export function useFilters() {
  const dataset = useDashboardStore((s) => s.dataset);
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const resetFilters = useDashboardStore((s) => s.resetFilters);

  const options = useMemo(() => {
    const rows = dataset?.rows ?? [];
    const meses = Array.from(
      new Set(rows.map((r) => r.mes).filter((v): v is number => v !== null)),
    ).sort((a, b) => a - b);
    const dias = Array.from(
      new Set(
        rows.map((r) => r.diaNumero).filter((v): v is number => v !== null),
      ),
    ).sort((a, b) => a - b);

    const tipos = Array.from(
      new Set(rows.map((r) => r.tipoBase).filter((v) => v))
    ).sort();

    return { meses, dias, tipos };
  }, [dataset]);

  const set = (partial: Partial<Filters>) => setFilters(partial);

  return { filters, set, resetFilters, options };
}

