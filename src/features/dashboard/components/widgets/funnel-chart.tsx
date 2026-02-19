"use client";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { formatInt } from "@/lib/utils/format";

const FUNNEL_COLORS = [
    "#00d4ff",
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
];

type FunnelStage = {
    name: string;
    value: number;
    color: string;
    pct: string;
};

export function FunnelChart() {
    const { totals } = useMetrics();

    const base = totals?.cargada || 1;

    const stages: FunnelStage[] = [
        { name: "Base Cargada", value: totals?.cargada || 0, color: FUNNEL_COLORS[0]!, pct: "100%" },
        { name: "Recorrido", value: totals?.recorrido || 0, color: FUNNEL_COLORS[1]!, pct: `${((totals?.recorrido || 0) / base * 100).toFixed(1)}%` },
        { name: "Contactados", value: totals?.contactado || 0, color: FUNNEL_COLORS[2]!, pct: `${((totals?.contactado || 0) / base * 100).toFixed(1)}%` },
        { name: "Citas", value: totals?.citas || 0, color: FUNNEL_COLORS[3]!, pct: `${((totals?.citas || 0) / base * 100).toFixed(1)}%` },
        { name: "Afluencias", value: totals?.af || 0, color: FUNNEL_COLORS[4]!, pct: `${((totals?.af || 0) / base * 100).toFixed(1)}%` },
        { name: "Matrículas", value: totals?.mc || 0, color: FUNNEL_COLORS[5]!, pct: `${((totals?.mc || 0) / base * 100).toFixed(1)}%` },
    ];

    return (
        <div className="h-full w-full flex items-center justify-center py-2">
            <div className="flex flex-col items-center w-full max-w-[500px] gap-0">
                {stages.map((stage, i) => {
                    // Width starts at 100% and narrows proportionally
                    const widthPct = Math.max(
                        ((stage.value / base) * 100),
                        8 // minimum 8% width so it's always visible
                    );

                    return (
                        <div
                            key={i}
                            className="relative group transition-all duration-300 hover:scale-[1.02]"
                            style={{
                                width: `${widthPct}%`,
                                minWidth: "80px",
                            }}
                        >
                            {/* Funnel segment */}
                            <div
                                className="relative flex items-center justify-between px-4 py-2.5 text-white transition-all"
                                style={{
                                    backgroundColor: stage.color,
                                    opacity: 1 - i * 0.08,
                                    clipPath: i < stages.length - 1
                                        ? `polygon(0 0, 100% 0, ${100 - (100 - (stages[i + 1]!.value / base * 100) / (stage.value / base * 100) * 100) / 2}% 100%, ${(100 - (stages[i + 1]!.value / base * 100) / (stage.value / base * 100) * 100) / 2}% 100%)`
                                        : `polygon(5% 0, 95% 0, 85% 100%, 15% 100%)`,
                                    borderRadius: i === 0 ? "6px 6px 0 0" : i === stages.length - 1 ? "0 0 4px 4px" : "0",
                                }}
                            >
                                <span className="text-xs font-semibold truncate drop-shadow-sm">
                                    {stage.name}
                                </span>
                                <span className="text-xs font-bold drop-shadow-sm whitespace-nowrap ml-2">
                                    {formatInt(stage.value)}
                                </span>
                            </div>

                            {/* Percentage badge on hover */}
                            <div className="absolute -right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white/60 whitespace-nowrap">
                                {stage.pct} de base
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
