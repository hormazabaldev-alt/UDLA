"use client";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { formatInt } from "@/lib/utils/format";

const STAGES = [
    { key: "cargada", label: "Base Cargada", gradient: "from-cyan-400 to-cyan-500" },
    { key: "recorrido", label: "Recorrido", gradient: "from-sky-400 to-sky-500" },
    { key: "contactado", label: "Contactados", gradient: "from-emerald-400 to-emerald-500" },
    { key: "citas", label: "Citas", gradient: "from-amber-400 to-amber-500" },
    { key: "af", label: "Afluencias", gradient: "from-violet-400 to-violet-500" },
    { key: "mc", label: "Matrículas", gradient: "from-pink-400 to-pink-500" },
] as const;

export function FunnelChart() {
    const { totals } = useMetrics();

    const base = totals?.cargada || 1;

    const data = STAGES.map((s) => {
        const value = totals?.[s.key] ?? 0;
        const pct = (value / base) * 100;
        return { ...s, value, pct };
    });

    return (
        <div className="h-full w-full flex flex-col justify-center gap-1.5 px-4 py-3">
            {data.map((stage, i) => {
                const barWidth = Math.max(stage.pct, 6); // minimum 6% so it's always visible
                const dropPct = i === 0 ? null : data[i - 1]!.value > 0
                    ? (((data[i - 1]!.value - stage.value) / data[i - 1]!.value) * 100).toFixed(0)
                    : null;

                return (
                    <div key={i} className="group flex items-center gap-3">
                        {/* Label */}
                        <div className="w-[100px] flex-shrink-0 text-right">
                            <span className="text-[11px] text-white/60 group-hover:text-white/90 transition">
                                {stage.label}
                            </span>
                        </div>

                        {/* Bar container */}
                        <div className="flex-1 relative h-[28px]">
                            {/* Background track */}
                            <div className="absolute inset-0 bg-white/[0.03] rounded-md" />

                            {/* Filled bar */}
                            <div
                                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${stage.gradient} rounded-md transition-all duration-500 ease-out flex items-center`}
                                style={{ width: `${barWidth}%` }}
                            >
                                {/* Subtle shine overlay */}
                                <div className="absolute inset-0 rounded-md bg-gradient-to-b from-white/20 to-transparent" style={{ height: '50%' }} />
                            </div>

                            {/* Value text - always visible on top */}
                            <div className="absolute inset-0 flex items-center px-3">
                                <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                                    {formatInt(stage.value)}
                                </span>
                            </div>
                        </div>

                        {/* Percentage */}
                        <div className="w-[55px] flex-shrink-0 text-right">
                            <span className="text-[11px] font-semibold text-white/50 tabular-nums">
                                {stage.pct.toFixed(1)}%
                            </span>
                        </div>

                        {/* Drop indicator */}
                        <div className="w-[40px] flex-shrink-0 text-right">
                            {dropPct !== null && Number(dropPct) > 0 ? (
                                <span className="text-[10px] text-red-400/70">
                                    −{dropPct}%
                                </span>
                            ) : i === 0 ? (
                                <span className="text-[10px] text-white/20">—</span>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
