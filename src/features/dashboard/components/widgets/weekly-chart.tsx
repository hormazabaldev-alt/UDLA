"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { getMetricWeekLabel, matchesTemporalFiltersForMetric } from "@/lib/data-processing/temporal";
import { calcResumenSemanal } from "@/lib/metrics/resumen-semanal";

/**
 * Weekly evolution chart: shows KPI metrics grouped by "Semana" field.
 */
export function WeeklyChart() {
    const { rows, filters } = useMetrics();

    const chartData = useMemo(() => {
        if (!rows || rows.length === 0) return null;
        const resumen = calcResumenSemanal(rows, { temporalFilters: filters ?? undefined });
        const contactadoByWeek = new Map<string, number>();
        for (const row of rows) {
            const conecta = row.conecta?.trim().toLowerCase() ?? "";
            if (conecta !== "conecta") continue;
            if (!matchesTemporalFiltersForMetric(row, filters, "contactado")) continue;
            const week = getMetricWeekLabel(row, "contactado");
            if (!week) continue;
            contactadoByWeek.set(week, (contactadoByWeek.get(week) ?? 0) + 1);
        }
        const weeks = resumen.rows.map((row) => row.semana);
        return {
            weeks,
            cargada: resumen.rows.map((row) => row.base),
            recorrido: resumen.rows.map((row) => row.recorrido),
            contactado: weeks.map((week) => contactadoByWeek.get(week) ?? 0),
            citas: resumen.rows.map((row) => row.citas),
            af: resumen.rows.map((row) => row.afluencias),
            mc: resumen.rows.map((row) => row.matriculas),
        };
    }, [filters, rows]);

    const option = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: "rgba(0,0,0,0.9)",
            borderColor: "#333",
            textStyle: { color: "#fff" },
        },
        legend: {
            data: ["Base", "Recorrido", "Contactado", "Citas", "AF", "MC"],
            textStyle: { color: "#aaa", fontSize: 10 },
            bottom: 0,
            itemWidth: 12,
            itemHeight: 8,
        },
        grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
        xAxis: {
            type: "category",
            data: chartData?.weeks || [],
            axisLine: { lineStyle: { color: "#333" } },
            axisLabel: { color: "#888", fontSize: 10, rotate: 30 },
            axisTick: { show: false },
        },
        yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "#1f1f1f" } },
            axisLabel: { color: "#888", fontSize: 10 },
        },
        series: [
            { name: "Base", type: "bar", stack: "total", data: chartData?.cargada || [], itemStyle: { color: "#00d4ff" }, barMaxWidth: 30 },
            { name: "Recorrido", type: "line", data: chartData?.recorrido || [], itemStyle: { color: "#0ea5e9" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
            { name: "Contactado", type: "line", data: chartData?.contactado || [], itemStyle: { color: "#10b981" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
            { name: "Citas", type: "line", data: chartData?.citas || [], itemStyle: { color: "#f59e0b" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
            { name: "AF", type: "line", data: chartData?.af || [], itemStyle: { color: "#f97316" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
            { name: "MC", type: "line", data: chartData?.mc || [], itemStyle: { color: "#3b82f6" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
        ],
    };

    return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
