"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";

/**
 * Weekly evolution chart: shows KPI metrics grouped by "Semana" field.
 */
export function WeeklyChart() {
    const { rows } = useMetrics();

    const chartData = useMemo(() => {
        if (!rows || rows.length === 0) return null;

        const groups = new Map<string, {
            cargada: number; recorrido: number; contactado: number;
            citas: number; af: number; mc: number;
        }>();

        for (const r of rows) {
            const week = r.semana?.trim() || "Sin Semana";
            if (!groups.has(week)) {
                groups.set(week, { cargada: 0, recorrido: 0, contactado: 0, citas: 0, af: 0, mc: 0 });
            }
            const g = groups.get(week)!;
            g.cargada++;
            const c = r.conecta?.trim().toLowerCase() ?? "";
            if (c === "conecta" || c === "no conecta") g.recorrido++;
            if (c === "conecta") g.contactado++;
            if (r.interesa?.trim().toLowerCase() === "viene") g.citas++;
            const afVal = r.af?.trim().toUpperCase() ?? "";
            if (afVal === "A" || afVal === "MC" || afVal === "M") g.af++;
            const mcVal = r.mc?.trim().toUpperCase() ?? "";
            if (mcVal === "M" || mcVal === "MC") g.mc++;
        }

        const weeks = Array.from(groups.keys()).sort();
        return {
            weeks,
            cargada: weeks.map(w => groups.get(w)!.cargada),
            recorrido: weeks.map(w => groups.get(w)!.recorrido),
            contactado: weeks.map(w => groups.get(w)!.contactado),
            citas: weeks.map(w => groups.get(w)!.citas),
            af: weeks.map(w => groups.get(w)!.af),
            mc: weeks.map(w => groups.get(w)!.mc),
        };
    }, [rows]);

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
