"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { toCampusFullName } from "@/lib/utils/campus";

type Metric = "af" | "mc";
type Dimension = "campus" | "regimen";

function isAfluenciaRow(row: { af?: string | null }) {
  const v = row.af?.trim().toUpperCase() ?? "";
  return v === "A" || v === "MC" || v === "M";
}

function isMatriculaRow(row: { mc?: string | null }) {
  const v = row.mc?.trim().toUpperCase() ?? "";
  return v === "M" || v === "MC";
}

export function MetricBreakdownChart({
  metric,
  dimension,
}: {
  metric: Metric;
  dimension: Dimension;
}) {
  const { rows } = useMetrics();

  const option = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const row of rows) {
      const counts =
        metric === "af" ? isAfluenciaRow(row) : isMatriculaRow(row);
      if (!counts) continue;

      const label =
        dimension === "campus"
          ? toCampusFullName(
              (metric === "af" ? row.afCampus : row.mcCampus) ??
                row.sedeInteres,
            )
          : ((row.regimen?.trim() || "Sin Régimen").toUpperCase());

      grouped.set(label, (grouped.get(label) ?? 0) + 1);
    }

    const entries = Array.from(grouped.entries()).sort((a, b) => {
      const diff = b[1] - a[1];
      if (diff !== 0) return diff;
      return a[0].localeCompare(b[0], "es");
    });

    const labels = entries.map((e) => e[0]);
    const data = entries.map((e) => e[1]);

    const name = metric === "af" ? "Afluencias" : "Matrículas";
    const color = metric === "af" ? "#f97316" : "#3b82f6";

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(0,0,0,0.9)",
        borderColor: "#333",
        textStyle: { color: "#fff" },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "8%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "#333" } },
        axisLabel: {
          color: "#888",
          fontSize: 10,
          rotate: dimension === "campus" ? 30 : 15,
          interval: 0,
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#1a1a1a" } },
        axisLabel: { color: "#888", fontSize: 10 },
      },
      series: [
        {
          name,
          type: "bar",
          data,
          itemStyle: { color },
          barMaxWidth: dimension === "campus" ? 30 : 40,
        },
      ],
    };
  }, [dimension, metric, rows]);

  return (
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
  );
}

