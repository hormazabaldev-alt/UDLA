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

    const semanas = Array.from(
      new Set(rows.map((r) => r.semana).filter((v): v is string => v !== null && v !== undefined))
    ).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

    const campus = Array.from(
      new Set(rows.map((r) => r.sedeInteres).filter((v): v is string => !!v))
    ).sort();

    const regimen = Array.from(
      new Set(rows.map((r) => r.regimen).filter((v): v is string => !!v))
    ).sort();

    return { meses, dias, tipos, semanas, campus, regimen };
  }, [dataset]);

  const set = (partial: Partial<Filters>) => setFilters(partial);

  return { filters, set, resetFilters, options };
}

