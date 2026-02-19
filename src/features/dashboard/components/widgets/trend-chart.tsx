"use client";

import ReactECharts from "echarts-for-react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { useTheme } from "next-themes";

export function TrendChart() {
    const { trend } = useMetrics();
    const { theme } = useTheme();

    const isDark = theme === "dark" || true; // Force dark

    // Transform data for Grouped Bar Chart
    // We expect trend.datasets to have [Stock, Web] or similar
    const seriesData = trend?.datasets.map((ds, index) => ({
        name: ds.label,
        type: 'bar',
        data: ds.data,
        itemStyle: {
            color: index === 0 ? '#0077b6' : '#fca311' // Blue for Stock, Orange for Web
        },
        barGap: '10%'
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
            textStyle: { color: "#ccc" },
            bottom: 0,
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "10%",
            top: "15%",
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
        series: seriesData.length > 0 ? seriesData : [
            // Fallback series if no data
            { type: 'bar', name: 'Stock', data: [] },
            { type: 'bar', name: 'Web', data: [] }
        ],
    };

    return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
