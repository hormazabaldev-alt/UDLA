"use client";

import { useState } from "react";

import {
    Plus,
    Replace,
    History,
    Share2,
    BarChart3
} from "lucide-react";
import { DataUploadDialog } from "@/features/dashboard/components/upload/data-upload-dialog";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { formatInt } from "@/lib/utils/format";
import { TrendChart } from "@/features/dashboard/components/widgets/trend-chart";
import { FunnelChart } from "@/features/dashboard/components/widgets/funnel-chart";
import { GaugeChart } from "@/features/dashboard/components/widgets/gauge-chart";
import { WeeklyChart } from "@/features/dashboard/components/widgets/weekly-chart";
import { DailyChart } from "@/features/dashboard/components/widgets/daily-chart";
import { EvolutionChart } from "@/features/dashboard/components/widgets/evolution-chart";
import { KpiCardsExtra } from "@/features/dashboard/components/widgets/kpi-cards-extra";
import { ResumenSemanalTable } from "@/features/dashboard/components/widgets/resumen-semanal-table";
import { SemanaKpisChart } from "@/features/dashboard/components/widgets/semana-kpis-chart";
import { DetalleRegistrosTable } from "@/features/dashboard/components/widgets/detalle-registros-table";
import { RegimenBreakdownChart } from "@/features/dashboard/components/widgets/regimen-breakdown-chart";
import { CampusBreakdownChart } from "@/features/dashboard/components/widgets/campus-breakdown-chart";
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

function MultiSelectGroup({
    label,
    options,
    selected,
    onToggle,
    onClear,
    getDisplayLabel = (v) => v
}: {
    label: string;
    options: (string | number)[];
    selected: (string | number)[];
    onToggle: (val: string | number) => void;
    onClear: () => void;
    getDisplayLabel?: (val: string | number) => React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <label className="text-xs text-[#00d4ff] uppercase font-bold tracking-wider">{label}</label>
            <div className="rounded-md border border-[#333] bg-[#1a1a1a] p-2">
                <div className="flex flex-wrap gap-1.5">
                    {options.length === 0 ? (
                        <span className="text-[11px] text-white/35 italic">Sin datos</span>
                    ) : (
                        options.map((opt) => {
                            const active = selected.includes(opt);
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => onToggle(opt)}
                                    className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition border"
                                    style={{
                                        backgroundColor: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
                                        borderColor: active ? "#00d4ff" : "rgba(255,255,255,0.08)",
                                        color: active ? "#00d4ff" : "rgba(255,255,255,0.55)",
                                    }}
                                >
                                    {getDisplayLabel(opt)}
                                </button>
                            );
                        })
                    )}
                </div>
                {selected.length > 0 ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className="mt-2 text-[10px] text-white/35 hover:text-white/60 transition"
                    >
                        Limpiar selección ({selected.length})
                    </button>
                ) : (
                    <div className="mt-2 text-[10px] text-white/35">Todos seleccionados</div>
                )}
            </div>
        </div>
    );
}

function VerticalFilters() {
    const { filters, set, resetFilters, options } = useFilters();

    const toggleFilter = (key: keyof typeof filters, val: string | number) => {
        const current = filters[key] as (string | number)[];
        if (current.includes(val)) {
            set({ [key]: current.filter(v => v !== val) });
        } else {
            set({ [key]: [...current, val] });
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            <MultiSelectGroup
                label="Tipo de Base"
                options={options.tipos}
                selected={filters.tipo}
                onToggle={(v) => toggleFilter("tipo", v)}
                onClear={() => set({ tipo: [] })}
            />
            <MultiSelectGroup
                label="Mes"
                options={options.meses}
                selected={filters.mes}
                onToggle={(v) => toggleFilter("mes", v)}
                onClear={() => set({ mes: [] })}
                getDisplayLabel={(v) => `Mes ${v}`}
            />
            <MultiSelectGroup
                label="Día"
                options={options.dias}
                selected={filters.diaNumero}
                onToggle={(v) => toggleFilter("diaNumero", v)}
                onClear={() => set({ diaNumero: [] })}
                getDisplayLabel={(v) => `Día ${v}`}
            />
            <MultiSelectGroup
                label="Semana"
                options={options.semanas}
                selected={filters.semanas}
                onToggle={(v) => toggleFilter("semanas", v)}
                onClear={() => set({ semanas: [] })}
            />
            <MultiSelectGroup
                label="Campus (Sede)"
                options={options.campus ?? []}
                selected={filters.campus}
                onToggle={(v) => toggleFilter("campus", v)}
                onClear={() => set({ campus: [] })}
            />
            <MultiSelectGroup
                label="Régimen"
                options={options.regimen ?? []}
                selected={filters.regimen}
                onToggle={(v) => toggleFilter("regimen", v)}
                onClear={() => set({ regimen: [] })}
            />

            <Button onClick={() => resetFilters()} variant="outline" className="mt-4 border-[#333] hover:bg-[#222] text-white/70">
                Limpiar Filtros
            </Button>
        </div>
    )
}


export function PowerBILayout() {
    const { totals } = useMetrics();
    const [copied, setCopied] = useState(false);

    // Check if viewer mode via URL param
    const isViewer = typeof window !== "undefined" && new URL(window.location.href).searchParams.get("mode") === "viewer";

    const handleShare = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", "viewer");
        navigator.clipboard.writeText(url.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex h-screen w-full bg-black text-white overflow-hidden font-sans">
            {/* Sidebar Panel */}
            <aside className="w-[240px] flex-shrink-0 bg-[#050505] border-r border-[#1f1f1f] flex flex-col">
                <div className="p-5 border-b border-[#1f1f1f]">
                    <h1 className="text-xl font-bold tracking-tighter text-white">
                        Dashboard <span className="text-[#00d4ff]">UDLA</span>
                    </h1>
                    <p className="text-xs text-white/50 mt-1">
                        {isViewer ? "Vista compartida" : "Bienvenido David"}
                    </p>
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-6">
                    <VerticalFilters />
                    {!isViewer && (
                        <div className="border-t border-[#1f1f1f] pt-4 space-y-2">
                            <div className="text-xs text-[#00d4ff] uppercase font-bold tracking-wider mb-2">Datos</div>
                            <DataUploadDialog
                                defaultMode="append"
                                triggerLabel="Agregar Bases"
                                triggerIcon={<Plus className="size-4" />}
                            />
                            <DataUploadDialog
                                defaultMode="replace"
                                triggerLabel="Reemplazar Data"
                                triggerIcon={<Replace className="size-4" />}
                            />
                            <a href="/analytics" className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition py-1.5 px-3">
                                <BarChart3 className="size-4" />
                                Análisis Avanzado
                            </a>
                            <a href="/logs" className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition py-1.5 px-3">
                                <History className="size-4" />
                                Ver Historial de Cargas
                            </a>
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition py-1.5 px-3 w-full text-left"
                            >
                                <Share2 className="size-4" />
                                {copied ? "¡Link copiado!" : "Compartir (solo lectura)"}
                            </button>
                        </div>
                    )}
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
                    <KpiCardsExtra />

                    {/* Row 1: Funnel full-width */}
                    <div className="h-[300px]">
                        <ChartCard title="Embudo de Conversión">
                            <FunnelChart />
                        </ChartCard>
                    </div>

                    {/* Row 2: 4 Gauges horizontal */}
                    <div className="grid grid-cols-6 gap-2 h-[120px]">
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2 text-[9px] text-white/50 font-medium">TC% Lla/Leads</span>
                            <GaugeChart title="" value={Math.round((totals?.tcLlaLeads || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2 text-[9px] text-white/50 font-medium">TC% Cont/Lla</span>
                            <GaugeChart title="" value={Math.round((totals?.tcContLla || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2 text-[9px] text-white/50 font-medium">C% Citas/Con</span>
                            <GaugeChart title="" value={Math.round((totals?.cCitasCon || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2 text-[9px] text-white/50 font-medium">TC% AF/Citas</span>
                            <GaugeChart title="" value={Math.round((totals?.tcAfCitas || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2 text-[9px] text-white/50 font-medium">TC% MC/AF</span>
                            <GaugeChart title="" value={Math.round((totals?.tcMcAf || 0) * 100)} />
                        </div>
                        <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm relative flex flex-col items-center justify-center">
                            <span className="absolute top-1.5 left-2 text-[9px] text-white/50 font-medium">C% MC/Leads</span>
                            <GaugeChart title="" value={Math.round((totals?.cMcLeads || 0) * 100)} />
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

                    {/* Row 5: Nuevo chart semanal */}
                    <div className="h-[360px]">
                        <ChartCard title="KPIs por Semana (Nuevo)">
                            <SemanaKpisChart />
                        </ChartCard>
                    </div>

                    {/* Row 6: Resumen Semanal */}
                    <div className="h-[420px]">
                        <ChartCard title="Resumen Semanal">
                            <ResumenSemanalTable />
                        </ChartCard>
                    </div>

                    {/* Row 7: Desglose por Campus y Regimen */}
                    <div className="grid grid-cols-2 gap-4 h-[360px]">
                        <ChartCard title="Matrículas y Afluencias por Campus">
                            <CampusBreakdownChart />
                        </ChartCard>
                        <ChartCard title="Matrículas y Afluencias por Régimen">
                            <RegimenBreakdownChart />
                        </ChartCard>
                    </div>

                    {/* Row 8: Detalle */}
                    <div className="h-[620px]">
                        <ChartCard title="Detalle de Registros (Nuevo)">
                            <DetalleRegistrosTable height={560} />
                        </ChartCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
