"use client";

import {
    Filter
} from "lucide-react";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { formatInt } from "@/lib/utils/format";
import { TrendChart } from "@/features/dashboard/components/widgets/trend-chart";
import { FunnelChart } from "@/features/dashboard/components/widgets/funnel-chart";
import { GaugeChart } from "@/features/dashboard/components/widgets/gauge-chart";
import { WeeklyChart } from "@/features/dashboard/components/widgets/weekly-chart";
import { DailyChart } from "@/features/dashboard/components/widgets/daily-chart";
import { EvolutionChart } from "@/features/dashboard/components/widgets/evolution-chart";
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative overflow-hidden flex flex-col">
            <div className="px-3 py-2 text-xs font-bold uppercase text-white/40 tracking-wider border-b border-[#1f1f1f] flex-shrink-0">
                {title}
            </div>
            <div className="flex-1 p-2 min-h-0">
                {children}
            </div>
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

            <div className="space-y-2">
                <label className="text-xs text-[#00d4ff] uppercase font-bold tracking-wider">Semana</label>
                <Select value={String(filters.semana ?? "All")} onValueChange={(v) => set({ semana: v === "All" ? "All" : v })}>
                    <SelectTrigger className="w-full bg-[#1a1a1a] border-[#333] text-white h-9">
                        <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                        <SelectItem value="All">Todas</SelectItem>
                        {options.semanas?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>) || null}
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
            <aside className="w-[240px] flex-shrink-0 bg-[#050505] border-r border-[#1f1f1f] flex flex-col">
                <div className="p-5 border-b border-[#1f1f1f]">
                    <h1 className="text-xl font-bold tracking-tighter text-white">
                        Altius <span className="text-[#00d4ff] block text-sm font-normal">Analytics Dashboard</span>
                    </h1>
                </div>
                <div className="p-5 flex-1 overflow-y-auto">
                    <VerticalFilters />
                </div>
                <div className="p-3 border-t border-[#1f1f1f] text-[10px] text-white/30 text-center">
                    v3.0 • Dashboard Premium
                </div>
            </aside>

            {/* Main Content - Scrollable */}
            <main className="flex-1 flex flex-col min-w-0 bg-black overflow-y-auto">
                {/* Top Metrics Row - Sticky */}
                <div className="sticky top-0 z-10 bg-black border-b border-[#1f1f1f]/50 px-5 py-3">
                    <div className="grid grid-cols-7 gap-6 items-start">
                        <MetricItem label="Base Cargada" value={formatInt(totals?.cargada || 0)} />
                        <MetricItem label="Recorrido" value={formatInt(totals?.recorrido || 0)} />
                        <MetricItem label="Contactado" value={formatInt(totals?.contactado || 0)} />
                        <MetricItem label="% Contact." value={`${((totals?.pctContactabilidad || 0) * 100).toFixed(1)}%`} />
                        <MetricItem label="Citas" value={formatInt(totals?.citas || 0)} />
                        <MetricItem label="AF (Afluencias)" value={formatInt(totals?.af || 0)} />
                        <MetricItem label="MC (Matrículas)" value={formatInt(totals?.mc || 0)} />
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="p-5 space-y-4 flex-1">
                    {/* Row 1: Funnel full-width */}
                    <div className="h-[300px]">
                        <ChartCard title="Embudo de Conversión">
                            <FunnelChart />
                        </ChartCard>
                    </div>

                    {/* Row 2: 4 Gauges horizontal */}
                    <div className="grid grid-cols-4 gap-3 h-[130px]">
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2.5 text-[10px] text-white/50 font-medium">% Contactabilidad</span>
                            <GaugeChart title="" value={Math.round((totals?.pctContactabilidad || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2.5 text-[10px] text-white/50 font-medium">% Efectividad</span>
                            <GaugeChart title="" value={Math.round((totals?.pctEfectividad || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2.5 text-[10px] text-white/50 font-medium">Tc% AF / Citas</span>
                            <GaugeChart title="" value={Math.round((totals?.tcAf || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2.5 text-[10px] text-white/50 font-medium">Tc% MC / Citas</span>
                            <GaugeChart title="" value={Math.round((totals?.tcMc || 0) * 100)} />
                        </div>
                    </div>

                    {/* Row 3: Resultado Mensual + Evolución */}
                    <div className="grid grid-cols-2 gap-4 h-[320px]">
                        <ChartCard title="Resultado Mensual (por Tipo Base)">
                            <TrendChart />
                        </ChartCard>
                        <ChartCard title="Evolución Mensual (KPIs)">
                            <EvolutionChart />
                        </ChartCard>
                    </div>

                    {/* Row 4: Semanal + Diario */}
                    <div className="grid grid-cols-2 gap-4 h-[320px]">
                        <ChartCard title="Comparativa Semanal">
                            <WeeklyChart />
                        </ChartCard>
                        <ChartCard title="Comparativa por Día">
                            <DailyChart />
                        </ChartCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
