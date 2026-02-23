"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";

export function CampusBreakdownChart() {
    const { rows } = useMetrics();

    const option = useMemo(() => {
        // Group by Sede Interes
        const grouped = new Map<string, { afluencias: number; matriculas: number }>();

        for (const row of rows) {
            const sede = (row.sedeInteres?.trim() || "Sin Campus").toUpperCase();
            if (!grouped.has(sede)) {
                grouped.set(sede, { afluencias: 0, matriculas: 0 });
            }

            const data = grouped.get(sede)!;

            // AFI
            const afVal = row.af?.trim().toUpperCase() ?? "";
            if (afVal === "A" || afVal === "MC" || afVal === "M") {
                data.afluencias++;
            }

            // MAT
            const mcVal = row.mc?.trim().toUpperCase() ?? "";
            if (mcVal === "M" || mcVal === "MC") {
                data.matriculas++;
            }
        }

        const campuses = Array.from(grouped.keys()).sort();
        const afluenciasData = campuses.map(c => grouped.get(c)!.afluencias);
        const matriculasData = campuses.map(c => grouped.get(c)!.matriculas);

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                backgroundColor: "rgba(0,0,0,0.9)",
                borderColor: "#333",
                textStyle: { color: "#fff" },
            },
            legend: {
                data: ["Afluencias", "Matrículas"],
                textStyle: { color: "#aaa", fontSize: 10 },
                bottom: 0,
                itemWidth: 10,
                itemHeight: 8,
            },
            grid: { left: "3%", right: "4%", bottom: "15%", top: "8%", containLabel: true },
            xAxis: {
                type: "category",
                data: campuses,
                axisLine: { lineStyle: { color: "#333" } },
                axisLabel: { color: "#888", fontSize: 10, rotate: 30, interval: 0 },
                axisTick: { show: false },
            },
            yAxis: {
                type: "value",
                splitLine: { lineStyle: { color: "#1a1a1a" } },
                axisLabel: { color: "#888", fontSize: 10 },
            },
            series: [
                {
                    name: "Afluencias",
                    type: "bar",
                    data: afluenciasData,
                    itemStyle: { color: "#f97316" },
                    barMaxWidth: 30,
                },
                {
                    name: "Matrículas",
                    type: "bar",
                    data: matriculasData,
                    itemStyle: { color: "#3b82f6" },
                    barMaxWidth: 30,
                },
            ],
        };
    }, [rows]);

    return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
