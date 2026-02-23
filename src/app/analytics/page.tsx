"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, BarChart3, TrendingUp, Loader2 } from "lucide-react";
import { formatInt } from "@/lib/utils/format";
import type { DataRow } from "@/lib/data-processing/types";
import { useData } from "@/features/dashboard/hooks/useData";

// ---------- Types ----------
type Metric = "cargada" | "recorrido" | "contactado" | "citas" | "af" | "mc";

const METRIC_INFO: Record<Metric, { label: string; color: string }> = {
    cargada: { label: "Base Cargada", color: "#00d4ff" },
    recorrido: { label: "Recorrido", color: "#0ea5e9" },
    contactado: { label: "Contactados", color: "#10b981" },
    citas: { label: "Citas", color: "#f59e0b" },
    af: { label: "Afluencias", color: "#f97316" },
    mc: { label: "Matrículas", color: "#3b82f6" },
};

const ALL_METRICS: Metric[] = ["cargada", "recorrido", "contactado", "citas", "af", "mc"];

// ---------- KPI computation per row ----------
function computeRowKPI(row: DataRow, metric: Metric): number {
    switch (metric) {
        case "cargada": return 1;
        case "recorrido": {
            const v = row.conecta?.trim().toLowerCase() ?? "";
            return (v === "conecta" || v === "no conecta") ? 1 : 0;
        }
        case "contactado": return row.conecta?.trim().toLowerCase() === "conecta" ? 1 : 0;
        case "citas": return row.interesa?.trim().toLowerCase() === "viene" ? 1 : 0;
        case "af": {
            const v = row.af?.trim().toUpperCase() ?? "";
            return (v === "A" || v === "MC" || v === "M") ? 1 : 0;
        }
        case "mc": {
            const v = row.mc?.trim().toUpperCase() ?? "";
            return (v === "M" || v === "MC") ? 1 : 0;
        }
    }
}

// ---------- Toggle Button ----------
function Toggle({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition border"
            style={{
                backgroundColor: active ? `${color}20` : "transparent",
                borderColor: active ? color : "rgba(255,255,255,0.1)",
                color: active ? color : "rgba(255,255,255,0.4)",
            }}
        >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? color : "rgba(255,255,255,0.2)" }} />
            {label}
        </button>
    );
}

// ---------- Multi Select Pills ----------
function MultiSelect({ label, options, selected, onChange }: {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (v: string[]) => void;
}) {
    const toggle = (val: string) => {
        if (selected.includes(val)) {
            onChange(selected.filter(v => v !== val));
        } else {
            onChange([...selected, val]);
        }
    };
    return (
        <div className="space-y-2">
            <div className="text-[10px] text-[#00d4ff] uppercase font-bold tracking-wider">{label}</div>
            <div className="flex flex-wrap gap-1.5">
                {options.length === 0 && (
                    <span className="text-[11px] text-white/30 italic">Sin datos</span>
                )}
                {options.map(o => (
                    <button
                        key={o.value}
                        onClick={() => toggle(o.value)}
                        className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition border cursor-pointer"
                        style={{
                            backgroundColor: selected.includes(o.value) ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
                            borderColor: selected.includes(o.value) ? "#00d4ff" : "rgba(255,255,255,0.08)",
                            color: selected.includes(o.value) ? "#00d4ff" : "rgba(255,255,255,0.5)",
                        }}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
            {selected.length > 0 && (
                <button
                    onClick={() => onChange([])}
                    className="text-[10px] text-white/30 hover:text-white/60 transition"
                >
                    Limpiar selección
                </button>
            )}
        </div>
    );
}

// ---------- Chart Card ----------
function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-[#1f1f1f] flex items-center gap-2">
                {icon}
                <span className="text-xs font-bold uppercase text-white/50 tracking-wider">{title}</span>
            </div>
            <div className="flex-1 p-3 min-h-[320px]">{children}</div>
        </div>
    );
}

// ---------- Main Analytics Page ----------
export default function AnalyticsPage() {
    // Load data from Supabase/localStorage (same as dashboard)
    const { dataset, hydrating } = useData();
    const rows = dataset?.rows ?? [];

    // Available options
    const availableMonths = useMemo(() => {
        return Array.from(new Set(rows.map(r => r.mes).filter((v): v is number => v !== null))).sort((a, b) => a - b);
    }, [rows]);

    const availableDays = useMemo(() => {
        const dayOrder = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
        const days = Array.from(new Set(rows.map(r => r.diaSemana).filter((v): v is string => !!v)));
        return days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    }, [rows]);

    const availableWeeks = useMemo(() => {
        return Array.from(new Set(rows.map(r => r.semana).filter((v): v is string => !!v)))
            .sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0));
    }, [rows]);

    // State
    const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(["recorrido", "contactado", "citas", "af", "mc"]);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);

    // Filtered rows based on selections
    const filteredRows = useMemo(() => {
        let r = rows;
        if (selectedMonths.length > 0) r = r.filter(row => row.mes !== null && selectedMonths.includes(String(row.mes)));
        if (selectedDays.length > 0) r = r.filter(row => row.diaSemana !== null && selectedDays.includes(row.diaSemana));
        if (selectedWeeks.length > 0) r = r.filter(row => row.semana !== null && selectedWeeks.includes(row.semana));
        return r;
    }, [rows, selectedMonths, selectedDays, selectedWeeks]);

    // --------- CHART 1: Monthly Comparison -----------
    const monthlyChart = useMemo(() => {
        const months = selectedMonths.length > 0
            ? availableMonths.filter(m => selectedMonths.includes(String(m)))
            : availableMonths;

        const labels = months.map(m => `Mes ${m}`);
        const series = selectedMetrics.map(metric => ({
            name: METRIC_INFO[metric].label,
            type: "bar" as const,
            data: months.map(m => {
                const monthRows = rows.filter(r => r.mes === m);
                return monthRows.reduce((sum, r) => sum + computeRowKPI(r, metric), 0);
            }),
            itemStyle: { color: METRIC_INFO[metric].color },
            barMaxWidth: 25,
        }));

        return {
            backgroundColor: "transparent",
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(0,0,0,0.9)", borderColor: "#333", textStyle: { color: "#fff" } },
            legend: { data: series.map(s => s.name), textStyle: { color: "#aaa", fontSize: 10 }, bottom: 0, itemWidth: 10, itemHeight: 8 },
            grid: { left: "3%", right: "4%", bottom: "15%", top: "8%", containLabel: true },
            xAxis: { type: "category", data: labels, axisLine: { lineStyle: { color: "#333" } }, axisLabel: { color: "#888", fontSize: 10 }, axisTick: { show: false } },
            yAxis: { type: "value", splitLine: { lineStyle: { color: "#1a1a1a" } }, axisLabel: { color: "#888", fontSize: 10 } },
            series,
        };
    }, [rows, availableMonths, selectedMonths, selectedMetrics]);

    // --------- CHART 2: Day comparison -----------
    const dailyChart = useMemo(() => {
        const dayOrder = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
        const days = selectedDays.length > 0 ? dayOrder.filter(d => selectedDays.includes(d)) : availableDays;

        const series = selectedMetrics.map(metric => ({
            name: METRIC_INFO[metric].label,
            type: "bar" as const,
            data: days.map(d => {
                const dayRows = filteredRows.filter(r => r.diaSemana === d);
                return dayRows.reduce((sum, r) => sum + computeRowKPI(r, metric), 0);
            }),
            itemStyle: { color: METRIC_INFO[metric].color },
            barMaxWidth: 30,
        }));

        return {
            backgroundColor: "transparent",
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(0,0,0,0.9)", borderColor: "#333", textStyle: { color: "#fff" } },
            legend: { data: series.map(s => s.name), textStyle: { color: "#aaa", fontSize: 10 }, bottom: 0, itemWidth: 10, itemHeight: 8 },
            grid: { left: "3%", right: "4%", bottom: "15%", top: "8%", containLabel: true },
            xAxis: { type: "category", data: days, axisLine: { lineStyle: { color: "#333" } }, axisLabel: { color: "#888", fontSize: 11 }, axisTick: { show: false } },
            yAxis: { type: "value", splitLine: { lineStyle: { color: "#1a1a1a" } }, axisLabel: { color: "#888", fontSize: 10 } },
            series,
        };
    }, [filteredRows, availableDays, selectedDays, selectedMetrics]);

    // --------- CHART 3: Weekly Trend -----------
    const weeklyTrend = useMemo(() => {
        const weeks = selectedWeeks.length > 0
            ? availableWeeks.filter(w => selectedWeeks.includes(w))
            : availableWeeks;

        const series = selectedMetrics.map(metric => ({
            name: METRIC_INFO[metric].label,
            type: "line" as const,
            data: weeks.map(w => {
                const weekRows = rows.filter(r => r.semana === w);
                return weekRows.reduce((sum, r) => sum + computeRowKPI(r, metric), 0);
            }),
            itemStyle: { color: METRIC_INFO[metric].color },
            lineStyle: { width: 2 },
            smooth: true,
            symbol: "circle",
            symbolSize: 5,
        }));

        return {
            backgroundColor: "transparent",
            tooltip: { trigger: "axis", backgroundColor: "rgba(0,0,0,0.9)", borderColor: "#333", textStyle: { color: "#fff" } },
            legend: { data: series.map(s => s.name), textStyle: { color: "#aaa", fontSize: 10 }, bottom: 0, itemWidth: 10, itemHeight: 8 },
            grid: { left: "3%", right: "4%", bottom: "15%", top: "8%", containLabel: true },
            xAxis: { type: "category", data: weeks, axisLine: { lineStyle: { color: "#333" } }, axisLabel: { color: "#888", fontSize: 10, rotate: 30 }, axisTick: { show: false }, boundaryGap: false },
            yAxis: { type: "value", splitLine: { lineStyle: { color: "#1a1a1a" } }, axisLabel: { color: "#888", fontSize: 10 } },
            series,
        };
    }, [rows, availableWeeks, selectedWeeks, selectedMetrics]);

    // --------- CHART 4: Conversion Rate Trend (6 correct rates) -----------
    const conversionChart = useMemo(() => {
        const months = selectedMonths.length > 0
            ? availableMonths.filter(m => selectedMonths.includes(String(m)))
            : availableMonths;
        const labels = months.map(m => `Mes ${m}`);

        const rates = months.map(m => {
            const mRows = rows.filter(r => r.mes === m);
            const base = mRows.reduce((s, r) => s + computeRowKPI(r, "cargada"), 0);
            const recorrido = mRows.reduce((s, r) => s + computeRowKPI(r, "recorrido"), 0);
            const contactado = mRows.reduce((s, r) => s + computeRowKPI(r, "contactado"), 0);
            const citas = mRows.reduce((s, r) => s + computeRowKPI(r, "citas"), 0);
            const afluencia = mRows.reduce((s, r) => s + computeRowKPI(r, "af"), 0);
            const mc = mRows.reduce((s, r) => s + computeRowKPI(r, "mc"), 0);
            return {
                tcLlaLeads: base > 0 ? (recorrido / base * 100) : 0,
                tcContLla: recorrido > 0 ? (contactado / recorrido * 100) : 0,
                cCitasCon: contactado > 0 ? (citas / contactado * 100) : 0,
                tcAfCitas: citas > 0 ? (afluencia / citas * 100) : 0,
                tcMcAf: afluencia > 0 ? (mc / afluencia * 100) : 0,
                cMcLeads: base > 0 ? (mc / base * 100) : 0,
            };
        });

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                backgroundColor: "rgba(0,0,0,0.9)", borderColor: "#333", textStyle: { color: "#fff" },
                formatter: (params: Array<{ seriesName: string; value: number; marker: string }>) => {
                    return params.map(p => `${p.marker} ${p.seriesName}: ${p.value.toFixed(1)}%`).join("<br/>");
                }
            },
            legend: { data: ["TC% Lla/Leads", "TC% Cont/Lla", "C% Citas/Con", "TC% AF/Citas", "TC% MC/AF", "C% MC/Leads"], textStyle: { color: "#aaa", fontSize: 9 }, bottom: 0, itemWidth: 10, itemHeight: 8 },
            grid: { left: "3%", right: "4%", bottom: "18%", top: "8%", containLabel: true },
            xAxis: { type: "category", data: labels, axisLine: { lineStyle: { color: "#333" } }, axisLabel: { color: "#888", fontSize: 10 }, axisTick: { show: false }, boundaryGap: false },
            yAxis: { type: "value", splitLine: { lineStyle: { color: "#1a1a1a" } }, axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" } },
            series: [
                { name: "TC% Lla/Leads", type: "line", data: rates.map(r => +r.tcLlaLeads.toFixed(1)), itemStyle: { color: "#00d4ff" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
                { name: "TC% Cont/Lla", type: "line", data: rates.map(r => +r.tcContLla.toFixed(1)), itemStyle: { color: "#10b981" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
                { name: "C% Citas/Con", type: "line", data: rates.map(r => +r.cCitasCon.toFixed(1)), itemStyle: { color: "#f59e0b" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
                { name: "TC% AF/Citas", type: "line", data: rates.map(r => +r.tcAfCitas.toFixed(1)), itemStyle: { color: "#f97316" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
                { name: "TC% MC/AF", type: "line", data: rates.map(r => +r.tcMcAf.toFixed(1)), itemStyle: { color: "#3b82f6" }, lineStyle: { width: 2 }, smooth: true, symbol: "circle", symbolSize: 5 },
                { name: "C% MC/Leads", type: "line", data: rates.map(r => +r.cMcLeads.toFixed(1)), itemStyle: { color: "#f43f5e" }, lineStyle: { width: 2, type: "dashed" }, smooth: true, symbol: "diamond", symbolSize: 5 },
            ],
        };
    }, [rows, availableMonths, selectedMonths]);

    // Summary KPIs for filtered data
    const summaryKPIs = useMemo(() => {
        return ALL_METRICS.map(metric => ({
            metric,
            ...METRIC_INFO[metric],
            value: filteredRows.reduce((sum, r) => sum + computeRowKPI(r, metric), 0),
        }));
    }, [filteredRows]);

    // Loading state
    if (hydrating) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="flex items-center gap-3 text-white/50">
                    <Loader2 className="size-5 animate-spin" />
                    Cargando datos...
                </div>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center space-y-3">
                    <h2 className="text-xl font-bold">Sin datos</h2>
                    <p className="text-white/50 text-sm">Carga un archivo Excel primero desde el Dashboard.</p>
                    <Link href="/" className="inline-flex items-center gap-1 text-[#00d4ff] text-sm hover:underline">
                        <ArrowLeft className="size-4" /> Ir al Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm border-b border-[#1f1f1f]">
                <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition">
                            <ArrowLeft className="size-4" /> Dashboard
                        </Link>
                        <h1 className="text-lg font-bold tracking-tight">
                            Análisis <span className="text-[#00d4ff]">Avanzado</span>
                        </h1>
                    </div>
                    {/* Summary KPIs */}
                    <div className="flex gap-5">
                        {summaryKPIs.map(kpi => (
                            <div key={kpi.metric} className="text-center">
                                <div className="text-lg font-bold" style={{ color: kpi.color }}>{formatInt(kpi.value)}</div>
                                <div className="text-[9px] text-white/40 uppercase">{kpi.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
                {/* Controls */}
                <div className="grid grid-cols-[1fr_1fr] gap-4">
                    {/* Left: Dimension selectors */}
                    <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg p-4 space-y-5">
                        <div className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 className="size-3.5" /> Dimensiones
                        </div>
                        <MultiSelect
                            label="Meses a comparar"
                            options={availableMonths.map(m => ({ value: String(m), label: `Mes ${m}` }))}
                            selected={selectedMonths}
                            onChange={setSelectedMonths}
                        />
                        <MultiSelect
                            label="Días de semana"
                            options={availableDays.map(d => ({ value: d, label: d }))}
                            selected={selectedDays}
                            onChange={setSelectedDays}
                        />
                        <MultiSelect
                            label="Semanas"
                            options={availableWeeks.map(w => ({ value: w, label: w }))}
                            selected={selectedWeeks}
                            onChange={setSelectedWeeks}
                        />
                    </div>

                    {/* Right: Metric selector */}
                    <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg p-4 space-y-4">
                        <div className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="size-3.5" /> Variables a mostrar
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {ALL_METRICS.map(metric => (
                                <Toggle
                                    key={metric}
                                    label={METRIC_INFO[metric].label}
                                    color={METRIC_INFO[metric].color}
                                    active={selectedMetrics.includes(metric)}
                                    onClick={() => {
                                        if (selectedMetrics.includes(metric)) {
                                            if (selectedMetrics.length > 1) {
                                                setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                                            }
                                        } else {
                                            setSelectedMetrics([...selectedMetrics, metric]);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                        <div className="text-[10px] text-white/30">
                            Selecciona las métricas que deseas visualizar. Al menos una debe estar activa.
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => setSelectedMetrics([...ALL_METRICS])}
                                className="text-[10px] text-[#00d4ff] hover:underline"
                            >
                                Seleccionar todas
                            </button>
                            <span className="text-white/20">|</span>
                            <button
                                onClick={() => { setSelectedMonths([]); setSelectedDays([]); setSelectedWeeks([]); setSelectedMetrics([...ALL_METRICS]); }}
                                className="text-[10px] text-white/40 hover:text-white/70"
                            >
                                Reset todo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <ChartCard title="Comparativa Mensual" icon={<BarChart3 className="size-3.5 text-white/30" />}>
                        <ReactECharts option={monthlyChart} notMerge={true} style={{ height: "100%", width: "100%" }} />
                    </ChartCard>

                    <ChartCard title="Comparativa por Día" icon={<BarChart3 className="size-3.5 text-white/30" />}>
                        <ReactECharts option={dailyChart} notMerge={true} style={{ height: "100%", width: "100%" }} />
                    </ChartCard>

                    <ChartCard title="Tendencia Semanal" icon={<TrendingUp className="size-3.5 text-white/30" />}>
                        <ReactECharts option={weeklyTrend} notMerge={true} style={{ height: "100%", width: "100%" }} />
                    </ChartCard>

                    <ChartCard title="Tasas de Conversión (Mensual)" icon={<TrendingUp className="size-3.5 text-white/30" />}>
                        <ReactECharts option={conversionChart} notMerge={true} style={{ height: "100%", width: "100%" }} />
                    </ChartCard>
                </div>
            </div>
        </div>
    );
}
