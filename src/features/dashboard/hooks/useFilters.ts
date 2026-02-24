"use client";

import { useMemo } from "react";

import type { Filters } from "@/store/dashboard-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { toCampusCode } from "@/lib/utils/campus";
import { compareSemanaLabels } from "@/lib/utils/semana";

export function useFilters() {
  const dataset = useDashboardStore((s) => s.dataset);
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const resetFilters = useDashboardStore((s) => s.resetFilters);

  const options = useMemo(() => {
    const rows = dataset?.rows ?? [];
    const fechasGestion = rows.map((r) => r.fechaGestion).filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
    const meses = Array.from(
      new Set(fechasGestion.map((d) => d.getMonth() + 1)),
    ).sort((a, b) => a - b);
    const dias = Array.from(
      new Set(
        fechasGestion.map((d) => d.getDate()),
      ),
    ).sort((a, b) => a - b);

    const tipos = Array.from(
      new Set(rows.map((r) => r.tipoBase).filter((v) => v))
    ).sort();

    const semanas = Array.from(
      new Set(rows.map((r) => r.semana).filter((v): v is string => v !== null && v !== undefined))
    ).sort(compareSemanaLabels);

    const campus = Array.from(
      new Set(rows.map((r) => toCampusCode(r.sedeInteres)).filter((v): v is string => !!v)),
    ).sort();

    const regimen = Array.from(
      new Set(rows.map((r) => r.regimen).filter((v): v is string => !!v))
    ).sort();

    return { meses, dias, tipos, semanas, campus, regimen };
  }, [dataset]);

  const set = (partial: Partial<Filters>) => setFilters(partial);

  return { filters, set, resetFilters, options };
}
