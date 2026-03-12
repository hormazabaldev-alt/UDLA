"use client";

import { useDeferredValue, useEffect, useMemo } from "react";

import type { Filters } from "@/store/dashboard-store";
import { useDashboardStore } from "@/store/dashboard-store";
import { toCampusCode } from "@/lib/utils/campus";
import {
  compareSemanaLabels,
  FECHA_GESTION_PERIOD_END,
  FECHA_GESTION_PERIOD_START,
  getSemanaCorrelativaLabel,
} from "@/lib/utils/semana";

function campaignMonthSortKey(month: number) {
  // Campaign starts in August (8), then wraps to Jan.
  return month >= 8 ? month - 8 : month + 4;
}

export function useFilters() {
  const dataset = useDashboardStore((s) => s.dataset);
  const filters = useDashboardStore((s) => s.filters);
  const setFilters = useDashboardStore((s) => s.setFilters);
  const resetFilters = useDashboardStore((s) => s.resetFilters);
  const deferredFilters = useDeferredValue(filters);

  const options = useMemo(() => {
    const rows = dataset?.rows ?? [];
    const now = new Date();
    const maxAllowedDate = now < FECHA_GESTION_PERIOD_END ? now : FECHA_GESTION_PERIOD_END;
    const fechasTemporales = rows
      .flatMap((r) => [r.fechaGestion, r.fechaAf, r.fechaMc])
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
      .filter((d) => d >= FECHA_GESTION_PERIOD_START && d <= maxAllowedDate);

    const meses = Array.from(
      new Set(fechasTemporales.map((d) => d.getMonth() + 1)),
    ).sort((a, b) => campaignMonthSortKey(a) - campaignMonthSortKey(b));
    const dias = Array.from(
      new Set(
        fechasTemporales.map((d) => d.getDate()),
      ),
    ).sort((a, b) => a - b);

    const tipos = Array.from(
      new Set(rows.map((r) => r.tipoBase).filter((v) => v))
    ).sort();

    const semanas = Array.from(
      new Set(
        rows.flatMap((r) => [
          r.semana,
          getSemanaCorrelativaLabel(r.fechaAf),
          getSemanaCorrelativaLabel(r.fechaMc),
        ]).filter((v): v is string => v !== null && v !== undefined),
      ),
    ).sort(compareSemanaLabels);

    const campus = Array.from(
      new Set(rows.map((r) => toCampusCode(r.sedeInteres)).filter((v): v is string => !!v)),
    ).sort();

    const regimen = Array.from(
      new Set(rows.map((r) => r.regimen).filter((v): v is string => !!v))
    ).sort();

    const carreraBaseRows = rows.filter((r) => {
      if (deferredFilters.tipo.length > 0 && !deferredFilters.tipo.includes(r.tipoBase)) return false;

      if (deferredFilters.campus.length > 0) {
        const campus = toCampusCode(r.sedeInteres);
        if (!campus || !deferredFilters.campus.includes(campus)) return false;
      }

      if (deferredFilters.regimen.length > 0) {
        const regimen = (r.regimen ?? "").trim();
        if (!regimen || !deferredFilters.regimen.includes(regimen)) return false;
      }

      if (deferredFilters.mes.length > 0) {
        if (!(r.fechaGestion instanceof Date) || Number.isNaN(r.fechaGestion.getTime())) return false;
        const month = r.fechaGestion.getMonth() + 1;
        if (!deferredFilters.mes.includes(month)) return false;
      }

      if (deferredFilters.diaNumero.length > 0) {
        if (!(r.fechaGestion instanceof Date) || Number.isNaN(r.fechaGestion.getTime())) return false;
        const day = r.fechaGestion.getDate();
        if (!deferredFilters.diaNumero.includes(day)) return false;
      }

      if (deferredFilters.semanas.length > 0) {
        const semana = (r.semana ?? "").trim();
        if (!semana || !deferredFilters.semanas.includes(semana)) return false;
      }

      return true;
    });

    const carreraInteres = Array.from(
      new Set(carreraBaseRows.map((r) => r.carreraInteres?.trim()).filter((v): v is string => !!v))
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    return { meses, dias, tipos, semanas, campus, regimen, carreraInteres };
  }, [
    dataset,
    deferredFilters.tipo,
    deferredFilters.campus,
    deferredFilters.regimen,
    deferredFilters.mes,
    deferredFilters.diaNumero,
    deferredFilters.semanas,
  ]);

  useEffect(() => {
    if (filters.carreraInteres.length === 0) return;

    const next = filters.carreraInteres.filter((value) => options.carreraInteres.includes(value));
    if (next.length !== filters.carreraInteres.length) {
      setFilters({ carreraInteres: next });
    }
  }, [filters.carreraInteres, options.carreraInteres, setFilters]);

  const set = (partial: Partial<Filters> | ((current: Filters) => Partial<Filters> | Filters)) => setFilters(partial);

  return { filters, set, resetFilters, options };
}
