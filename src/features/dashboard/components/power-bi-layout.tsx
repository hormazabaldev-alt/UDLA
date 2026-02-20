"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

import {
    Plus,
    Replace,
    History,
    Share2,
    BarChart3,
    Info
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

function MetricItem({ label, value, subValue, tooltip }: { label: string; value: string; subValue?: string; tooltip?: string }) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="flex flex-col cursor-help">
                        <span className="text-3xl font-bold text-[#00d4ff] tracking-tighter leading-none">{value}</span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[13px] text-white/90 uppercase tracking-wide font-bold">{label}</span>
                            {tooltip && <Info className="size-3.5 text-white/40 hover:text-white/80 transition-colors" />}
                        </div>
                        {subValue && <span className="text-[10px] text-white/40 mt-1">{subValue}</span>}
                    </div>
                </TooltipTrigger>
                {tooltip && (
                    <TooltipContent>
                        <p className="max-w-[200px] text-center">{tooltip}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}

function ChartCard({ title, children, tooltip, className }: { title: string; children: React.ReactNode; tooltip?: string; className?: string }) {
    return (
        <div className={cn("bg-[#080808] border border-[#1f1f1f] rounded-lg relative overflow-hidden flex flex-col", className)}>
            <div className="px-4 py-3 border-b border-[#1f1f1f] flex-shrink-0 flex items-center justify-between gap-2">
                <span className="text-sm font-bold uppercase text-white/90 tracking-wider">
                    {title}
                </span>
                {tooltip && (
                    <TooltipProvider>
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Info className="size-4 text-white/40 cursor-help hover:text-white/80 transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-[250px]">{tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="flex-1 p-3 min-h-0">
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
                                    className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors border hover:bg-white/5 hover:text-white"
                                    style={{
                                        backgroundColor: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.04)",
                                        borderColor: active ? "#00d4ff" : "rgba(255,255,255,0.08)",
                                        color: active ? "#00d4ff" : "rgba(255,255,255,0.65)",
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

    const temporalActiveCount = filters.mes.length + filters.diaNumero.length + filters.semanas.length;

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Filtros Base (Siempre visibles) */}
            <div className="space-y-6">
                <MultiSelectGroup
                    label="Tipo de Base"
                    options={options.tipos}
                    selected={filters.tipo}
                    onToggle={(v) => toggleFilter("tipo", v)}
                    onClear={() => set({ tipo: [] })}
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
            </div>
            {/* Filtros Temporales (Colapsables) */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="temporales" className="border-t border-[#1f1f1f]/50 border-b-0 pt-2">
                    <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <span>Filtros Temporales</span>
                            {temporalActiveCount > 0 && (
                                <span className="flex items-center justify-center bg-[#00d4ff]/20 text-[#00d4ff] text-[10px] h-4 min-w-4 px-1 rounded-full">
                                    {temporalActiveCount}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2 space-y-6">
                        <MultiSelectGroup
                            label="Mes"
                            options={options.meses}
                            selected={filters.mes}
                            onToggle={(v) => toggleFilter("mes", v)}
                            onClear={() => set({ mes: [] })}
                            getDisplayLabel={(v) => `Mes ${v}`}
                        />
                        <MultiSelectGroup
                            label="Semana"
                            options={options.semanas}
                            selected={filters.semanas}
                            onToggle={(v) => toggleFilter("semanas", v)}
                            onClear={() => set({ semanas: [] })}
                        />
                        <MultiSelectGroup
                            label="Día"
                            options={options.dias}
                            selected={filters.diaNumero}
                            onToggle={(v) => toggleFilter("diaNumero", v)}
                            onClear={() => set({ diaNumero: [] })}
                            getDisplayLabel={(v) => `Día ${v}`}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Button onClick={() => resetFilters()} variant="outline" className="mt-2 border-[#333] hover:bg-[#222] text-white/70">
                Limpiar Todos los Filtros
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
            <aside className="w-[280px] flex-shrink-0 bg-[#050505] border-r border-[#1f1f1f] flex flex-col">
                <div className="p-6 border-b border-[#1f1f1f]">
                    <h1 className="text-xl font-bold tracking-tighter text-white">
                        Dashboard <span className="text-[#00d4ff]">UDLA</span>
                    </h1>
                    <p className="text-xs text-white/50 mt-1">
                        {isViewer ? "Vista compartida" : "Bienvenido David"}
                    </p>
                </div>
                <div className="p-6 flex-1 overflow-y-auto space-y-7">
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
                        <MetricItem label="Base Cargada" value={formatInt(totals?.cargada || 0)} tooltip="Total de leads cargados en la base de datos." />
                        <MetricItem label="Recorrido" value={formatInt(totals?.recorrido || 0)} tooltip="Leads que han sido gestionados o contactados de alguna forma." />
                        <MetricItem label="Contactado" value={formatInt(totals?.contactado || 0)} tooltip="Leads con los que se logró contacto efectivo." />
                        <MetricItem label="% Contact." value={`${((totals?.pctContactabilidad || 0) * 100).toFixed(1)}%`} tooltip="Porcentaje de leads contactados sobre el total recorrido." />
                        <MetricItem label="Citas" value={formatInt(totals?.citas || 0)} tooltip="Citas agendadas con éxito producto del contacto." />
                        <MetricItem label="AF (Afluencias)" value={formatInt(totals?.af || 0)} tooltip="Leads que efectivamente asistieron (Afluencias)." />
                        <MetricItem label="MC (Matrículas)" value={formatInt(totals?.mc || 0)} tooltip="Matrículas concretadas finales." />
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="p-5 space-y-4 flex-1">
                    <KpiCardsExtra />

                    {/* Row 1: Funnel full-width */}
                    <div className="h-[300px]">
                        <ChartCard title="Embudo de Conversión" tooltip="Visualiza la pérdida de leads en cada etapa del funnel: desde Carga hasta Matrícula.">
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
                        <ChartCard title="Resultado Mensual (por Tipo Base)" tooltip="Comportamiento y rendimiento histórico por tipo de base a lo largo de los meses.">
                            <TrendChart />
                        </ChartCard>
                        <ChartCard title="Evolución Mensual (KPIs)" tooltip="Muestra cómo varían las métricas clave porcentuales (ej. % Contactabilidad, Cierre) mensualmente.">
                            <EvolutionChart />
                        </ChartCard>
                    </div>

                    {/* Row 4: Semanal + Diario */}
                    <div className="grid grid-cols-2 gap-4 h-[320px]">
                        <ChartCard title="Comparativa Semanal" tooltip="Volumen de Citas, AF y MC consolidado por semana del año.">
                            <WeeklyChart />
                        </ChartCard>
                        <ChartCard title="Comparativa por Día" tooltip="Distribución del rendimiento según los días calendario.">
                            <DailyChart />
                        </ChartCard>
                    </div>

                    {/* Row 5: Nuevo chart semanal */}
                    <div className="h-[520px]">
                        <ChartCard title="KPIs por Semana (Nuevo)" tooltip="Gráfico detallado de las métricas agrupadas por semana específica con metas comparativas." className="h-full">
                            <SemanaKpisChart />
                        </ChartCard>
                    </div>

                    {/* Row 6: Resumen Semanal */}
                    <div className="h-[420px]">
                        <ChartCard title="Resumen Semanal" tooltip="Tabla consolidada que muestra el rendimiento detallado semana a semana.">
                            <ResumenSemanalTable />
                        </ChartCard>
                    </div>

                    {/* Row 7: Desglose por Campus y Regimen */}
                    <div className="grid grid-cols-2 gap-4 h-[360px]">
                        <ChartCard title="Matrículas y Afluencias por Campus" tooltip="Distribución geográfica u organizacional por sede (Campus) de los leads efectivos.">
                            <CampusBreakdownChart />
                        </ChartCard>
                        <ChartCard title="Matrículas y Afluencias por Régimen" tooltip="Rendimiento segmentado por régimen de estudio.">
                            <RegimenBreakdownChart />
                        </ChartCard>
                    </div>

                    {/* Row 8: Detalle */}
                    <div className="h-[620px]">
                        <ChartCard title="Detalle de Registros (Nuevo)" tooltip="Tabla de datos granulares para revisión uno a uno de los registros que componen los KPIs.">
                            <DetalleRegistrosTable height={560} />
                        </ChartCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
