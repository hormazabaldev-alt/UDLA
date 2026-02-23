"use client";

import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { normalizeRut } from "@/lib/utils/rut";

const DIAS_ORDER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/**
 * Daily comparison chart: shows KPI metrics grouped by day of week.
 */
export function DailyChart() {
    const { rows } = useMetrics();

    const chartData = useMemo(() => {
        if (!rows || rows.length === 0) return null;

        const groups = new Map<string, {
            cargada: number; recorrido: number; contactado: number;
            citasRuts: Set<string>; af: number; mc: number;
        }>();

        for (const r of rows) {
            const day = r.diaSemana?.trim() || null;
            if (!day) continue;
            if (!groups.has(day)) {
                groups.set(day, { cargada: 0, recorrido: 0, contactado: 0, citasRuts: new Set(), af: 0, mc: 0 });
            }
            const g = groups.get(day)!;
            g.cargada++;
            const c = r.conecta?.trim().toLowerCase() ?? "";
            if (c === "conecta" || c === "no conecta") g.recorrido++;
            if (c === "conecta") g.contactado++;
            if (r.interesa?.trim().toLowerCase() === "viene") g.citasRuts.add(normalizeRut(r.rutBase));
            const afVal = r.af?.trim().toUpperCase() ?? "";
            if (afVal === "A" || afVal === "MC" || afVal === "M") g.af++;
            const mcVal = r.mc?.trim().toUpperCase() ?? "";
            if (mcVal === "M" || mcVal === "MC") g.mc++;
        }

        const days = DIAS_ORDER.filter(d => groups.has(d));
        return {
            days,
            cargada: days.map(d => groups.get(d)!.cargada),
            recorrido: days.map(d => groups.get(d)!.recorrido),
            contactado: days.map(d => groups.get(d)!.contactado),
            citas: days.map(d => groups.get(d)!.citasRuts.size),
            af: days.map(d => groups.get(d)!.af),
            mc: days.map(d => groups.get(d)!.mc),
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
        series: [
            { name: "Base", type: "bar", data: chartData?.cargada || [], itemStyle: { color: "#00d4ff" }, barMaxWidth: 35 },
            { name: "Recorrido", type: "bar", data: chartData?.recorrido || [], itemStyle: { color: "#0ea5e9" }, barMaxWidth: 35 },
            { name: "Contactado", type: "bar", data: chartData?.contactado || [], itemStyle: { color: "#10b981" }, barMaxWidth: 35 },
            { name: "Citas", type: "bar", data: chartData?.citas || [], itemStyle: { color: "#f59e0b" }, barMaxWidth: 35 },
            { name: "AF", type: "bar", data: chartData?.af || [], itemStyle: { color: "#f97316" }, barMaxWidth: 35 },
            { name: "MC", type: "bar", data: chartData?.mc || [], itemStyle: { color: "#3b82f6" }, barMaxWidth: 35 },
        ],
    };

    return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
