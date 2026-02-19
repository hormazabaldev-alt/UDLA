"use client";

import { useMemo } from "react";
import {
    BarChart3,
    Layers3,
    Table as TableIcon,
    Filter
} from "lucide-react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { formatInt } from "@/lib/utils/format";
import { TrendChart } from "@/features/dashboard/components/widgets/trend-chart";
import { FunnelChart } from "@/features/dashboard/components/widgets/funnel-chart";
import { GaugeChart } from "@/features/dashboard/components/widgets/gauge-chart";
import { useFilters } from "@/features/dashboard/hooks/useFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BaseType } from "@/lib/data-processing/types";
import { Button } from "@/components/ui/button";

function MetricItem({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-3xl font-bold text-[#00d4ff] tracking-tighter leading-none">{value}</span>
            <span className="text-xs text-white/60 uppercase tracking-wide font-semibold mt-1">{label}</span>
            {subValue && <span className="text-[10px] text-white/40">{subValue}</span>}
        </div>
    );
}

function VerticalFilters() {
    const { filters, set, resetFilters, options } = useFilters();

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="space-y-2">
                <label className="text-xs text-[#00d4ff] uppercase font-bold tracking-wider">Tipo de Base</label>
                <Select value={filters.tipo} onValueChange={(v) => set({ tipo: v as BaseType | "All" })}>
                    <SelectTrigger className="w-full bg-[#1a1a1a] border-[#333] text-white h-9">
                        <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                        <SelectItem value="All">Todas</SelectItem>
                        {options.tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-[#00d4ff] uppercase font-bold tracking-wider">Mes</label>
                <Select value={String(filters.mes)} onValueChange={(v) => set({ mes: v === "All" ? "All" : Number(v) })}>
                    <SelectTrigger className="w-full bg-[#1a1a1a] border-[#333] text-white h-9">
                        <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                        <SelectItem value="All">Todos</SelectItem>
                        {options.meses.map(m => <SelectItem key={m} value={String(m)}>{`Mes ${m}`}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-xs text-[#00d4ff] uppercase font-bold tracking-wider">Día</label>
                <Select value={String(filters.diaNumero)} onValueChange={(v) => set({ diaNumero: v === "All" ? "All" : Number(v) })}>
                    <SelectTrigger className="w-full bg-[#1a1a1a] border-[#333] text-white h-9">
                        <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                        <SelectItem value="All">Todos</SelectItem>
                        {options.dias.map(d => <SelectItem key={d} value={String(d)}>{`Día ${d}`}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <Button onClick={() => resetFilters()} variant="outline" className="mt-4 border-[#333] hover:bg-[#222] text-white/70">
                Limpiar Filtros
            </Button>
        </div>
    )
}

export function PowerBILayout() {
    const { totals } = useMetrics();

    return (
        <div className="flex h-screen w-full bg-black text-white overflow-hidden font-sans">
            {/* Sidebar Panel */}
            <aside className="w-[260px] flex-shrink-0 bg-[#050505] border-r border-[#1f1f1f] flex flex-col">
                <div className="p-6 border-b border-[#1f1f1f]">
                    <h1 className="text-2xl font-bold tracking-tighter text-white">
                        5019 <span className="text-[#00d4ff] block text-lg font-normal">Outbound</span>
                    </h1>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <VerticalFilters />
                </div>
                <div className="p-4 border-t border-[#1f1f1f] text-[10px] text-white/30 text-center">
                    v2.1.0 • Power BI Clone
                </div>
            </aside>

            {/* Main Grid */}
            <main className="flex-1 flex flex-col min-w-0 bg-black p-5 gap-5 overflow-hidden">
                {/* Top Metrics Row */}
                <div className="grid grid-cols-7 gap-8 items-start h-[80px] flex-shrink-0 border-b border-[#1f1f1f]/50 pb-2">
                    <MetricItem label="Base Cargada" value={formatInt(totals?.cargada || 0)} />
                    <MetricItem label="Recorrido" value={formatInt(totals?.recorrido || 0)} />
                    <MetricItem label="Contactado" value={formatInt(totals?.contactado || 0)} />
                    <MetricItem label="% Contact." value={`${((totals?.pctContactabilidad || 0) * 100).toFixed(1)} %`} />
                    <MetricItem label="Citas" value={formatInt(totals?.citas || 0)} />
                    <MetricItem label="AF (Afluencias)" value={formatInt(totals?.af || 0)} />
                    <MetricItem label="MC (Matrículas)" value={formatInt(totals?.mc || 0)} />
                </div>

                {/* Main Chart Row */}
                <div className="flex-[2] min-h-0 border border-[#1f1f1f] bg-[#080808] relative rounded-sm group">
                    <div className="absolute top-2 left-3 text-xs font-bold uppercase text-white/40 tracking-wider z-10">Resultado Mensual</div>
                    <div className="h-full w-full p-2 pt-6">
                        <TrendChart />
                    </div>
                </div>

                {/* Bottom Detailed Row */}
                <div className="flex-[3] min-h-0 grid grid-cols-[180px_1fr_1.2fr] gap-4">
                    {/* Left: Gauges */}
                    <div className="flex flex-col gap-2 justify-between h-full py-1">
                        <div className="flex-1 bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1 left-2 text-[10px] text-white/50">% Contactabilidad</span>
                            <GaugeChart title="" value={Math.round((totals?.pctContactabilidad || 0) * 100)} />
                        </div>
                        <div className="flex-1 bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1 left-2 text-[10px] text-white/50">% Efectividad</span>
                            <GaugeChart title="" value={Math.round((totals?.pctEfectividad || 0) * 100)} />
                        </div>
                        <div className="flex-1 bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1 left-2 text-[10px] text-white/50">Tc% AF / Citas</span>
                            <GaugeChart title="" value={Math.round((totals?.tcAf || 0) * 100)} />
                        </div>
                        <div className="flex-1 bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1 left-2 text-[10px] text-white/50">Tc% M / Citas</span>
                            <GaugeChart title="" value={Math.round((totals?.tcMc || 0) * 100)} />
                        </div>
                    </div>

                    {/* Center: Funnel */}
                    <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative overflow-hidden">
                        <div className="absolute top-2 left-3 text-xs font-bold uppercase text-white/40 tracking-wider z-10">Embudo de Conversión</div>
                        <div className="h-full w-full p-4">
                            <FunnelChart />
                        </div>
                    </div>

                    {/* Right: Table Placeholder (Advanced Grid) */}
                    <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative overflow-hidden flex items-center justify-center">
                        <div className="absolute top-2 left-3 text-xs font-bold uppercase text-white/40 tracking-wider z-10">Información Diaria</div>
                        <div className="text-center opacity-30">
                            <TableIcon className="size-12 mx-auto mb-2" />
                            <p className="text-sm">Data Grid Component</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
