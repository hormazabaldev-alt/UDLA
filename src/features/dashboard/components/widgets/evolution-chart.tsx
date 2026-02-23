"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";

/**
 * Evolution chart: shows cumulative KPI progression by month.
 * Uses stacked area to visualize the full conversion pipeline.
 */
export function EvolutionChart() {
    const { rows } = useMetrics();

    const chartData = useMemo(() => {
        if (!rows || rows.length === 0) return null;

        const groups = new Map<number, {
            recorrido: number; contactado: number;
            citas: number; af: number; mc: number;
        }>();

        for (const r of rows) {
            const mes = r.mes;
            if (mes === null || mes === undefined) continue;
            if (!groups.has(mes)) {
                groups.set(mes, { recorrido: 0, contactado: 0, citas: 0, af: 0, mc: 0 });
            }
            const g = groups.get(mes)!;
            const c = r.conecta?.trim().toLowerCase() ?? "";
            if (c === "conecta" || c === "no conecta") g.recorrido++;
            if (c === "conecta") g.contactado++;
            if (r.interesa?.trim().toLowerCase() === "viene") g.citas++;
            const afVal = r.af?.trim().toUpperCase() ?? "";
            if (afVal === "A" || afVal === "MC" || afVal === "M") g.af++;
            const mcVal = r.mc?.trim().toUpperCase() ?? "";
            if (mcVal === "M" || mcVal === "MC") g.mc++;
        }

        const months = Array.from(groups.keys()).sort((a, b) => a - b);
        const labels = months.map(m => `Mes ${m}`);

        return {
            labels,
            recorrido: months.map(m => groups.get(m)!.recorrido),
            contactado: months.map(m => groups.get(m)!.contactado),
            citas: months.map(m => groups.get(m)!.citas),
            af: months.map(m => groups.get(m)!.af),
            mc: months.map(m => groups.get(m)!.mc),
        };
    }, [rows]);

    const areaStyle = { opacity: 0.15 };

    const option = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(0,0,0,0.9)",
            borderColor: "#333",
            textStyle: { color: "#fff" },
        },
        legend: {
            data: ["Recorrido", "Contactado", "Citas", "AF", "MC"],
            textStyle: { color: "#aaa", fontSize: 10 },
            bottom: 0,
            itemWidth: 12,
            itemHeight: 8,
        },
        grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
        xAxis: {
            type: "category",
            data: chartData?.labels || [],
            axisLine: { lineStyle: { color: "#333" } },
            axisLabel: { color: "#888", fontSize: 11 },
            axisTick: { show: false },
            boundaryGap: false,
        },
        yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "#1f1f1f" } },
            axisLabel: { color: "#888", fontSize: 10 },
        },
        series: [
            { name: "Recorrido", type: "line", data: chartData?.recorrido || [], itemStyle: { color: "#0ea5e9" }, areaStyle, smooth: true, lineStyle: { width: 2 }, symbol: "none" },
            { name: "Contactado", type: "line", data: chartData?.contactado || [], itemStyle: { color: "#10b981" }, areaStyle, smooth: true, lineStyle: { width: 2 }, symbol: "none" },
            { name: "Citas", type: "line", data: chartData?.citas || [], itemStyle: { color: "#f59e0b" }, areaStyle, smooth: true, lineStyle: { width: 2 }, symbol: "none" },
            { name: "AF", type: "line", data: chartData?.af || [], itemStyle: { color: "#f97316" }, areaStyle, smooth: true, lineStyle: { width: 2 }, symbol: "none" },
            { name: "MC", type: "line", data: chartData?.mc || [], itemStyle: { color: "#3b82f6" }, areaStyle, smooth: true, lineStyle: { width: 2 }, symbol: "none" },
        ],
    };

    return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
