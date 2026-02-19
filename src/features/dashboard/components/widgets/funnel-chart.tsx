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

    const colors = ["#00d4ff", "#0ea5e9", "#06b6d4", "#8b5cf6", "#a855f7", "#c084fc"];

    const option = {
        backgroundColor: "transparent",
        tooltip: {
            trigger: "item",
            formatter: (params: { name: string; value: number; percent: number }) =>
                `<strong>${params.name}</strong><br/>${formatInt(params.value)} (${params.percent?.toFixed(1)}%)`,
            backgroundColor: "rgba(0,0,0,0.9)",
            borderColor: "#333",
            textStyle: { color: "#fff" },
        },
        series: [
            {
                name: "Embudo de Conversión",
                type: "funnel",
                left: "5%",
                top: 10,
                bottom: 10,
                width: "90%",
                min: 0,
                max: funnelData[0]?.value || 100,
                minSize: "5%",
                maxSize: "100%",
                sort: "descending",
                gap: 3,
                label: {
                    show: true,
                    position: "inside",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: "bold",
                    formatter: (params: { name: string; value: number }) =>
                        `${params.name}\n${formatInt(params.value)}`,
                },
                labelLine: { show: false },
                itemStyle: {
                    borderColor: "transparent",
                    borderWidth: 0,
                },
                data: funnelData.map((item, i) => ({
                    ...item,
                    itemStyle: {
                        color: colors[i],
                        opacity: 1 - i * 0.1,
                    },
                })),
            },
        ],
    };

    return (
        <div className="h-full w-full min-h-[250px]">
            <ReactECharts
                option={option}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
            />
        </div>
    );
}
