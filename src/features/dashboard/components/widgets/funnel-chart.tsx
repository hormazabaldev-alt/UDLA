"use client";

import ReactECharts from "echarts-for-react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { formatInt } from "@/lib/utils/format";

export function FunnelChart() {
    const { totals } = useMetrics();

    const funnelData = [
        { value: totals?.cargada || 0, name: "Base Cargada" },
        { value: totals?.recorrido || 0, name: "Recorrido" },
        { value: totals?.contactado || 0, name: "Contactados" },
        { value: totals?.citas || 0, name: "Citas" },
        { value: totals?.af || 0, name: "Afluencias" },
        { value: totals?.mc || 0, name: "Matrículas" },
    ];

    const colors = [
        "rgba(0, 212, 255, 0.85)",  // cyan
        "rgba(14, 165, 233, 0.80)", // sky
        "rgba(16, 185, 129, 0.75)", // emerald
        "rgba(245, 158, 11, 0.75)", // amber
        "rgba(139, 92, 246, 0.80)", // violet
        "rgba(236, 72, 153, 0.85)", // pink
    ];

    const option = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "item",
            formatter: (params: { name: string; value: number }) => {
                const base = funnelData[0]?.value || 1;
                const pct = ((params.value / base) * 100).toFixed(1);
                return `<strong>${params.name}</strong><br/>${formatInt(params.value)} <span style="color:#aaa">(${pct}% de Base)</span>`;
            },
            backgroundColor: "rgba(0,0,0,0.9)",
            borderColor: "#333",
            textStyle: { color: "#fff", fontSize: 12 },
        },
        series: [
            {
                name: "Embudo",
                type: "funnel",
                left: "15%",
                top: 20,
                bottom: 20,
                width: "70%",
                min: 0,
                max: funnelData[0]?.value || 100,
                minSize: "8%",
                maxSize: "100%",
                sort: "descending",
                gap: 4,
                label: {
                    show: true,
                    position: "inside",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    formatter: (params: { name: string; value: number }) =>
                        `${params.name}  ${formatInt(params.value)}`,
                },
                labelLine: { show: false },
                itemStyle: {
                    borderColor: "rgba(0,0,0,0.3)",
                    borderWidth: 1,
                    borderRadius: [4, 4, 0, 0],
                },
                emphasis: {
                    label: { fontSize: 13, fontWeight: "bold" },
                    itemStyle: { shadowBlur: 15, shadowColor: "rgba(0, 212, 255, 0.3)" },
                },
                data: funnelData.map((item, i) => ({
                    ...item,
                    itemStyle: { color: colors[i] },
                })),
            },
        ],
    };

    return (
        <div className="h-full w-full min-h-[200px]">
            <ReactECharts
                option={option}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
            />
        </div>
    );
}
