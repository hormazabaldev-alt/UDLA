"use client";

import ReactECharts from "echarts-for-react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";

const COLORS = ["#00d4ff", "#0ea5e9", "#10b981", "#f59e0b", "#f97316", "#3b82f6", "#f43f5e", "#06b6d4"];

export function TrendChart() {
    const { trend } = useMetrics();

    const seriesData = trend?.datasets.map((ds, index) => ({
        name: ds.label,
        type: 'bar',
        data: ds.data,
        itemStyle: { color: COLORS[index % COLORS.length] },
        barGap: '10%',
        barMaxWidth: 35,
    })) || [];

    const option = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: 'rgba(0,0,0,0.9)',
            borderColor: '#333',
            textStyle: { color: '#fff' }
        },
        legend: {
            data: trend?.datasets.map(d => d.label) || [],
            textStyle: { color: "#ccc", fontSize: 10 },
            bottom: 0,
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "12%",
            top: "10%",
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: trend?.labels || [],
            axisLine: { lineStyle: { color: "#333" } },
            axisLabel: { color: "#888", fontSize: 11 },
            axisTick: { show: false }
        },
        yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "#1f1f1f" } },
            axisLabel: { color: "#888", fontSize: 11 },
        },
        series: seriesData,
    };

    return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
