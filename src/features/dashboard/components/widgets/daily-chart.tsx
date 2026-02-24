"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { useDashboardStore } from "@/store/dashboard-store";
import { normalizeRut } from "@/lib/utils/rut";
import { isInteresaViene } from "@/lib/utils/interesa";
import { formatInt } from "@/lib/utils/format";

const DIAS_ORDER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_LABELER = new Intl.DateTimeFormat("es-CL", { month: "short" });

type MetricKey = "cargada" | "recorrido" | "contactado" | "citas" | "af" | "mc";

const METRIC_CONFIG: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: "cargada", label: "Base", color: "#00d4ff" },
  { key: "recorrido", label: "Recorrido", color: "#0ea5e9" },
  { key: "contactado", label: "Contactado", color: "#10b981" },
  { key: "citas", label: "Citas", color: "#f59e0b" },
  { key: "af", label: "AF", color: "#f97316" },
  { key: "mc", label: "MC", color: "#3b82f6" },
];

type DayCounters = {
  cargada: number;
  recorrido: number;
  contactado: number;
  citasRuts: Set<string>;
  af: number;
  mc: number;
};

function emptyDayCounters(): DayCounters {
  return {
    cargada: 0,
    recorrido: 0,
    contactado: 0,
    citasRuts: new Set<string>(),
    af: 0,
    mc: 0,
  };
}

function asMetricValue(group: DayCounters, metric: MetricKey): number {
  if (metric === "citas") return group.citasRuts.size;
  return group[metric];
}

function monthName(month: number): string {
  return MONTH_LABELER.format(new Date(2026, month - 1, 1)).replace(".", "");
}

function formatMonthLabel(month: number): string {
  return `Mes ${month} (${monthName(month)})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = Number.parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toRgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getMonthAlpha(index: number, total: number): number {
  if (total <= 1) return 1;
  return Math.max(0.35, 1 - index * (0.55 / (total - 1)));
}

/**
 * Daily comparison chart: shows KPI metrics grouped by day of week.
 */
export function DailyChart() {
  const { rows } = useMetrics();
  const selectedMonths = useDashboardStore((s) => s.filters.mes);

  const chartData = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    const splitByMonth = selectedMonths.length > 1;

    if (!splitByMonth) {
      const groups = new Map<string, DayCounters>();

      for (const r of rows) {
        const day = r.diaSemana?.trim() || null;
        if (!day) continue;
        if (!groups.has(day)) groups.set(day, emptyDayCounters());
        const g = groups.get(day)!;
        g.cargada++;
        const c = r.conecta?.trim().toLowerCase() ?? "";
        if (c === "conecta" || c === "no conecta") g.recorrido++;
        if (c === "conecta") g.contactado++;
        if (isInteresaViene(r.interesa)) g.citasRuts.add(normalizeRut(r.rutBase));
        const afVal = r.af?.trim().toUpperCase() ?? "";
        if (afVal === "A" || afVal === "MC" || afVal === "M") g.af++;
        const mcVal = r.mc?.trim().toUpperCase() ?? "";
        if (mcVal === "M" || mcVal === "MC") g.mc++;
      }

      const days = DIAS_ORDER.filter((d) => groups.has(d));
      const series = METRIC_CONFIG.map((m) => ({
        name: m.label,
        type: "bar",
        data: days.map((d) => asMetricValue(groups.get(d)!, m.key)),
        itemStyle: { color: m.color },
        barMaxWidth: 35,
      }));
      return {
        days,
        series,
        legendData: series.map((s) => s.name),
        comparisonMonths: [] as number[],
      };
    }

    const months = Array.from(new Set(selectedMonths)).sort((a, b) => a - b);
    const monthSet = new Set(months);
    const monthGroups = new Map<number, Map<string, DayCounters>>();

    for (const month of months) monthGroups.set(month, new Map());

    for (const r of rows) {
      const day = r.diaSemana?.trim() || null;
      const date = r.fechaGestion;
      if (!day || !(date instanceof Date) || Number.isNaN(date.getTime())) continue;
      const month = date.getMonth() + 1;
      if (!monthSet.has(month)) continue;

      const perMonth = monthGroups.get(month)!;
      if (!perMonth.has(day)) perMonth.set(day, emptyDayCounters());
      const g = perMonth.get(day)!;
      g.cargada++;
      const c = r.conecta?.trim().toLowerCase() ?? "";
      if (c === "conecta" || c === "no conecta") g.recorrido++;
      if (c === "conecta") g.contactado++;
      if (isInteresaViene(r.interesa)) g.citasRuts.add(normalizeRut(r.rutBase));
      const afVal = r.af?.trim().toUpperCase() ?? "";
      if (afVal === "A" || afVal === "MC" || afVal === "M") g.af++;
      const mcVal = r.mc?.trim().toUpperCase() ?? "";
      if (mcVal === "M" || mcVal === "MC") g.mc++;
    }

    const series: Array<Record<string, unknown>> = [];
    for (const [monthIndex, month] of months.entries()) {
      const alpha = getMonthAlpha(monthIndex, months.length);
      const perMonth = monthGroups.get(month)!;
      for (const metric of METRIC_CONFIG) {
        series.push({
          name: `${metric.label} · ${formatMonthLabel(month)}`,
          type: "bar",
          data: DIAS_ORDER.map((d) => {
            const g = perMonth.get(d);
            return g ? asMetricValue(g, metric.key) : 0;
          }),
          itemStyle: { color: toRgba(metric.color, alpha) },
          barMaxWidth: 20,
          emphasis: { focus: "series" },
        });
      }
    }

    return {
      days: DIAS_ORDER,
      series,
      legendData: series.map((s) => String(s.name)),
      comparisonMonths: months,
    };
  }, [rows, selectedMonths]);

  const option = useMemo(() => {
    const hasMonthComparison = (chartData?.comparisonMonths?.length ?? 0) > 1;
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(0,0,0,0.9)",
        borderColor: "#333",
        textStyle: { color: "#fff" },
        formatter: (params: Array<{ axisValue?: string; marker?: string; seriesName?: string; data?: unknown }>) => {
          const title = params?.[0]?.axisValue ?? "";
          const lines = (params ?? []).map((p) => `${p.marker ?? ""}${p.seriesName ?? ""}: <b>${formatInt(Number(p.data ?? 0))}</b>`);
          return [`<div style="font-weight:700;margin-bottom:6px;">${title}</div>`, ...lines].join("<br/>");
        },
      },
      legend: {
        type: hasMonthComparison ? "scroll" : "plain",
        data: chartData?.legendData ?? [],
        textStyle: { color: "#aaa", fontSize: 10 },
        bottom: 0,
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: hasMonthComparison ? "25%" : "15%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: chartData?.days || [],
        axisLine: { lineStyle: { color: "#333" } },
        axisLabel: { color: "#888", fontSize: 11 },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#1f1f1f" } },
        axisLabel: { color: "#888", fontSize: 10 },
      },
      series: chartData?.series ?? [],
    };
  }, [chartData]);

  const monthComparisonLabel = useMemo(() => {
    if (!chartData || chartData.comparisonMonths.length <= 1) return null;
    return chartData.comparisonMonths.map((m) => formatMonthLabel(m)).join(" vs ");
  }, [chartData]);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {monthComparisonLabel ? (
        <div className="mb-1 text-[10px] text-white/55 truncate">
          Comparando: <span className="text-white/80">{monthComparisonLabel}</span>
        </div>
      ) : null}
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
