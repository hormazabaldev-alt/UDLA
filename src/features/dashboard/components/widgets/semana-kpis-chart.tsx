"use client";

import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { calcResumenSemanal } from "@/lib/metrics/resumen-semanal";
import { formatInt } from "@/lib/utils/format";

type LineMetric = "none" | "pctMatriculas" | "pctAfluencia";
type SeriesItem = { name: string } & Record<string, unknown>;
type TooltipParam = {
  axisValue?: string;
  seriesType?: string;
  data?: unknown;
  seriesName?: string;
  color?: string;
};

function formatPct(value01: number, digits = 0) {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value01);
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition border"
      style={{
        backgroundColor: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
        borderColor: active ? "#00d4ff" : "rgba(255,255,255,0.08)",
        color: active ? "#00d4ff" : "rgba(255,255,255,0.55)",
      }}
    >
      {label}
    </button>
  );
}

export function SemanaKpisChart() {
  const { rows } = useMetrics();
  const [lineMetric, setLineMetric] = useState<LineMetric>("pctMatriculas");

  const resumen = useMemo(() => calcResumenSemanal(rows), [rows]);

  const option = useMemo(() => {
    const labels = resumen.rows.map((r) => r.semana);

    const series: SeriesItem[] = [
      {
        name: "Citas",
        type: "bar",
        data: resumen.rows.map((r) => r.citas),
        itemStyle: { color: "#00d4ff" },
        barMaxWidth: 18,
      },
      {
        name: "Recorrido",
        type: "bar",
        data: resumen.rows.map((r) => r.recorrido),
        itemStyle: { color: "#0ea5e9" },
        barMaxWidth: 18,
      },
      {
        name: "Afluencias",
        type: "bar",
        data: resumen.rows.map((r) => r.afluencias),
        itemStyle: { color: "#f97316" },
        barMaxWidth: 18,
      },
      {
        name: "Matrículas",
        type: "bar",
        data: resumen.rows.map((r) => r.matriculas),
        itemStyle: { color: "#3b82f6" },
        barMaxWidth: 18,
      },
    ];

    if (lineMetric !== "none") {
      series.push({
        name: lineMetric === "pctMatriculas" ? "% Matrículas" : "% Afluencia",
        type: "line",
        yAxisIndex: 1,
        data: resumen.rows.map((r) =>
          lineMetric === "pctMatriculas" ? r.pctMatriculas : r.pctAfluencia,
        ),
        itemStyle: { color: "#a78bfa" },
        lineStyle: { width: 2 },
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
      });
    }

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(0,0,0,0.92)",
        borderColor: "#333",
        textStyle: { color: "#fff" },
        formatter: (params: TooltipParam[]) => {
          const title = params?.[0]?.axisValue ?? "";
          const lines = (params ?? []).map((p) => {
            const isPct = p.seriesType === "line";
            const v = p.data ?? 0;
            const valueText = isPct ? formatPct(Number(v), 0) : formatInt(Number(v));
            return `<div style="display:flex;justify-content:space-between;gap:12px;">
              <span>
                <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${p.color};margin-right:6px;"></span>
                ${p.seriesName}
              </span>
              <b style="color:rgba(255,255,255,0.9)">${valueText}</b>
            </div>`;
          });
          return `<div style="font-weight:700;margin-bottom:6px;">${title}</div>${lines.join("")}`;
        },
      },
      legend: {
        data: series.map((s) => s.name),
        textStyle: { color: "#aaa", fontSize: 10 },
        bottom: 0,
        itemWidth: 10,
        itemHeight: 8,
      },
      grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "#333" } },
        axisLabel: { color: "#888", fontSize: 10, rotate: 30 },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: "value",
          splitLine: { lineStyle: { color: "#1f1f1f" } },
          axisLabel: { color: "#888", fontSize: 10 },
        },
        {
          type: "value",
          min: 0,
          max: 1,
          interval: 0.25,
          splitLine: { show: false },
          axisLabel: {
            color: "#888",
            fontSize: 10,
            formatter: (v: number) => formatPct(v, 0),
          },
        },
      ],
      series,
    };
  }, [lineMetric, resumen.rows]);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="flex items-center justify-end gap-2 mb-2">
        <div className="text-[11px] text-white/40 mr-auto">
          Línea:{" "}
          <span className="text-white/70">
            {lineMetric === "none"
              ? "—"
              : lineMetric === "pctMatriculas"
                ? "% Matrículas"
                : "% Afluencia"}
          </span>
        </div>
        <ToggleButton label="Sin línea" active={lineMetric === "none"} onClick={() => setLineMetric("none")} />
        <ToggleButton
          label="% Matrículas"
          active={lineMetric === "pctMatriculas"}
          onClick={() => setLineMetric("pctMatriculas")}
        />
        <ToggleButton
          label="% Afluencia"
          active={lineMetric === "pctAfluencia"}
          onClick={() => setLineMetric("pctAfluencia")}
        />
      </div>
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
