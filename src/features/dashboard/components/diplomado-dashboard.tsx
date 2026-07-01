"use client";

import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, BarChart3, CalendarDays, Database, PhoneCall, Route, Target } from "lucide-react";
import { useMemo, useState } from "react";

import type { DataRow } from "@/lib/data-processing/types";
import { formatInt } from "@/lib/utils/format";
import { normalizeRut } from "@/lib/utils/rut";
import { useDataDiplomado } from "@/features/dashboard/hooks/useDataDiplomado";
import { DiplomadoUploadPanel } from "@/features/dashboard/components/upload/diplomado-upload-panel";

// ─── Types ───────────────────────────────────────────────────────────────────

type Counts = {
  recorrido: number;
  contactados: number;
  citas: number;
  matriculas: number;
  matriculasSinCita: number;
};

type GroupRow = Counts & {
  name: string;
  convFinal: number;
  contactabilidad: number;
  citaContactado: number;
  citaMatricula: number;
};

type TabKey = "kpis" | "ejecutivos" | "carreras" | "regimen" | "tipoBase" | "temporal" | "proyecciones";

type DiplomadoFilters = {
  mes: string;
  mesMatricula: string;
  semana: string;
  carrera: string;
  regimen: string;
  tipoBase: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const colors = {
  orange: "#e8620a",
  amber: "#facc15",
  green: "#4ade80",
  blue: "#60a5fa",
  red: "#f87171",
  violet: "#a78bfa",
  cyan: "#22d3ee",
};

const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

const EMPTY_FILTERS: DiplomadoFilters = { mes: "", mesMatricula: "", semana: "", carrera: "", regimen: "", tipoBase: "" };
const EMPTY_ROWS: DataRow[] = [];

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "kpis", label: "KPIs" },
  { key: "ejecutivos", label: "Ejecutivos" },
  { key: "carreras", label: "Carreras" },
  { key: "regimen", label: "Régimen" },
  { key: "tipoBase", label: "Tipo Base" },
  { key: "temporal", label: "Temporal" },
  { key: "proyecciones", label: "Proyecciones" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyCounts(): Counts {
  return { recorrido: 0, contactados: 0, citas: 0, matriculas: 0, matriculasSinCita: 0 };
}

function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function formatPct(v: number) { return `${v}%`; }
function formatSignedPct(v: number) { return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`; }
function normalizeLabel(v: string | null | undefined, fallback: string) { const t = v?.trim(); return t && t.length > 0 ? t : fallback; }
function getMonthLabel(d: Date | null | undefined) { if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null; return MESES_ES[d.getMonth()] ?? null; }
function getGestionMes(row: DataRow) { return row.mesLabel?.trim().toLowerCase() || getMonthLabel(row.fechaGestion) || ""; }
function getMatriculaMes(row: DataRow) { return getMonthLabel(row.fechaMatricula) || getMonthLabel(row.fechaAf) || getMonthLabel(row.fechaMc) || ""; }
function getMatriculaValue(row: DataRow) { return (row.af || row.mc || "").trim().toUpperCase(); }

function isContactadoHtml(row: DataRow) {
  const interesa = (row.interesa || "").trim();
  const conecta = (row.conecta || "").trim().toLowerCase();
  const contactados = ["Viene", "No Viene", "Volver a llamar", "Volver a Llamar ", "A", "M", "MC"];
  if (contactados.some((v) => interesa === v || interesa.toLowerCase() === v.toLowerCase())) return true;
  return conecta === "conecta";
}

function isCitaHtml(row: DataRow) { return (row.interesa || "").trim() === "Viene"; }
function isMatriculaHtml(row: DataRow) { return ["M", "MC"].includes(getMatriculaValue(row)); }

function matchesFilters(row: DataRow, filters: DiplomadoFilters) {
  if (filters.carrera && row.carreraInteres !== filters.carrera) return false;
  if (filters.regimen && row.regimen !== filters.regimen) return false;
  if (filters.tipoBase && row.tipoBase !== filters.tipoBase) return false;
  return true;
}

function buildGestionRows(rows: DataRow[], filters: DiplomadoFilters) {
  return rows.filter((row) => {
    if (filters.mes && getGestionMes(row) !== filters.mes) return false;
    if (filters.semana && row.semana !== filters.semana) return false;
    return matchesFilters(row, filters);
  });
}

function buildMatriculaRows(rows: DataRow[], filters: DiplomadoFilters) {
  return rows.filter((row) => {
    if (!isMatriculaHtml(row)) return false; // Diplomados: sin afluencia, directo a matrícula
    const mes = filters.mesMatricula || filters.mes;
    if (mes && getMatriculaMes(row) !== mes) return false;
    return matchesFilters(row, filters);
  });
}

function countRows(d: DataRow[], md: DataRow[]): Counts {
  const c = emptyCounts();
  c.recorrido = d.length;
  c.contactados = d.filter(isContactadoHtml).length;
  c.citas = d.filter(isCitaHtml).length;
  c.matriculas = md.filter(isMatriculaHtml).length;
  c.matriculasSinCita = md.filter((r) => isMatriculaHtml(r) && !isCitaHtml(r)).length;
  return c;
}

function countUniqueRuts(rows: DataRow[], predicate?: (r: DataRow) => boolean) {
  const ruts = new Set<string>();
  for (const row of rows) {
    if (predicate && !predicate(row)) continue;
    const rut = normalizeRut(row.rutBase);
    if (rut) ruts.add(rut);
  }
  return ruts.size;
}

function buildGroupRows(d: DataRow[], md: DataRow[], getName: (r: DataRow) => string): GroupRow[] {
  const g = new Map<string, { recorrido: number; contactados: number; citas: number }>();
  const m = new Map<string, { matriculas: number; matriculasSinCita: number }>();

  for (const row of d) {
    const name = getName(row);
    const cur = g.get(name) ?? { recorrido: 0, contactados: 0, citas: 0 };
    cur.recorrido += 1;
    if (isContactadoHtml(row)) cur.contactados += 1;
    if (isCitaHtml(row)) cur.citas += 1;
    g.set(name, cur);
  }
  for (const row of md) {
    const name = getName(row);
    const cur = m.get(name) ?? { matriculas: 0, matriculasSinCita: 0 };
    if (isMatriculaHtml(row)) cur.matriculas += 1;
    if (isMatriculaHtml(row) && !isCitaHtml(row)) cur.matriculasSinCita += 1;
    m.set(name, cur);
  }

  return Array.from(new Set([...g.keys(), ...m.keys()]))
    .map((name) => {
      const gv = g.get(name) ?? { recorrido: 0, contactados: 0, citas: 0 };
      const mv = m.get(name) ?? { matriculas: 0, matriculasSinCita: 0 };
      return {
        name,
        ...gv,
        ...mv,
        contactabilidad: pct(gv.contactados, gv.recorrido),
        citaContactado: pct(gv.citas, gv.contactados),
        citaMatricula: pct(mv.matriculas, gv.citas),
        convFinal: pct(mv.matriculas, gv.recorrido),
      };
    })
    .filter((r) => r.recorrido > 0 || r.matriculas > 0)
    .sort((a, b) => b.recorrido - a.recorrido || b.matriculas - a.matriculas || a.name.localeCompare(b.name, "es"));
}

function buildValueRows(rows: DataRow[], getName: (r: DataRow) => string) {
  const map = new Map<string, number>();
  for (const row of rows) { const n = getName(row); map.set(n, (map.get(n) ?? 0) + 1); }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function percentBar(value: number, tone: keyof typeof colors = "orange") {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#2d2d44]">
      <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: colors[tone] }} />
    </div>
  );
}

function KpiCard({ label, value, detail, tone = "orange", icon: Icon }: {
  label: string; value: string; detail: string; tone?: keyof typeof colors;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-[#2d2d44] bg-[#171725] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#c0c0d8]">{label}</div>
        <Icon className="size-4 text-white/35" />
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums" style={{ color: colors[tone] }}>{value}</div>
      <div className="mt-1 text-xs text-[#9090b0]">{detail}</div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#2d2d44] bg-[#1a1a2e] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#e8620a]">{title}</h2>
      </div>
      <div className="mb-4 h-[3px] rounded-full bg-gradient-to-r from-[#e8620a] to-[#ff9444]" />
      {children}
    </section>
  );
}

function tableTone(v: number) {
  if (v >= 60) return "bg-emerald-500/15 text-emerald-300";
  if (v >= 40) return "bg-yellow-500/15 text-yellow-300";
  return "bg-red-500/15 text-red-300";
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="min-w-[150px] flex-1 text-xs text-[#9090b0]">
      <span className="mb-1 block">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-[#3d3d5c] bg-[#2d2d44] px-2 text-xs text-[#e8e8f0] outline-none focus:border-[#e8620a]">
        <option value="">Todos</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DiplomadoDashboard() {
  const { dataset, hydrating, refreshDataset } = useDataDiplomado();
  const [filters, setFilters] = useState<DiplomadoFilters>(EMPTY_FILTERS);
  const [activeTab, setActiveTab] = useState<TabKey>("kpis");
  const rows = useMemo(() => dataset?.rows ?? EMPTY_ROWS, [dataset]);

  const options = useMemo(() => {
    const uniq = (values: Array<string | null | undefined>) =>
      Array.from(new Set(values.map((v) => v?.trim()).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, "es"));
    return {
      mesGestion: MESES_ES.filter((m) => rows.some((r) => getGestionMes(r) === m)),
      mesMatricula: MESES_ES.filter((m) => rows.some((r) => getMatriculaMes(r) === m)),
      semana: uniq(rows.map((r) => r.semana)),
      carrera: uniq(rows.map((r) => r.carreraInteres)),
      regimen: uniq(rows.map((r) => r.regimen)),
      tipoBase: uniq(rows.map((r) => r.tipoBase)),
    };
  }, [rows]);

  const gestionRows = useMemo(() => buildGestionRows(rows, filters), [rows, filters]);
  const matriculaRows = useMemo(() => buildMatriculaRows(rows, filters), [rows, filters]);
  const summary = useMemo(() => countRows(gestionRows, matriculaRows), [gestionRows, matriculaRows]);
  const uniqueLeads = useMemo(() => countUniqueRuts(gestionRows), [gestionRows]);
  const promedioIntentos = useMemo(() => {
    const sum = gestionRows.reduce((acc, r) => acc + (parseFloat(r.intentos || "") || 0), 0);
    return gestionRows.length > 0 ? (sum / gestionRows.length).toFixed(1) : "0";
  }, [gestionRows]);

  const agentRows = useMemo(() => buildGroupRows(gestionRows, matriculaRows, (r) => normalizeLabel(r.agente, "Sin ejecutivo")), [gestionRows, matriculaRows]);
  const regimenRows = useMemo(() => buildGroupRows(gestionRows, matriculaRows, (r) => normalizeLabel(r.regimen, "Sin régimen")), [gestionRows, matriculaRows]);
  const tipoRows = useMemo(() => buildGroupRows(gestionRows, matriculaRows, (r) => normalizeLabel(r.tipoBase, "Sin tipo")), [gestionRows, matriculaRows]);
  const allCarreraRows = useMemo(() => buildGroupRows(gestionRows, matriculaRows, (r) => normalizeLabel(r.carreraInteres, "Sin carrera")).sort((a, b) => b.matriculas - a.matriculas || b.recorrido - a.recorrido), [gestionRows, matriculaRows]);
  const conectaRows = useMemo(() => buildValueRows(gestionRows, (r) => normalizeLabel(r.conecta, "Sin conecta")), [gestionRows]);
  const interesaRows = useMemo(() => buildValueRows(gestionRows, (r) => normalizeLabel(r.interesa, "Sin interesa")), [gestionRows]);
  const weekRows = useMemo(() => buildGroupRows(gestionRows, matriculaRows, (r) => normalizeLabel(r.semana, "Sin semana")).sort((a, b) => (parseInt(a.name.replace(/\D/g, ""), 10) || 0) - (parseInt(b.name.replace(/\D/g, ""), 10) || 0)), [gestionRows, matriculaRows]);
  const monthRows = useMemo(() => buildGroupRows(gestionRows, matriculaRows, (r) => normalizeLabel(getGestionMes(r), "Sin mes")).sort((a, b) => MESES_ES.indexOf(a.name) - MESES_ES.indexOf(b.name)), [gestionRows, matriculaRows]);

  const projectionRows = useMemo(() => {
    const base = weekRows.filter((r) => r.name !== "Sin semana");
    const recent = base.slice(-4);
    const div = recent.length || 1;
    const avg = { recorrido: Math.round(recent.reduce((s, r) => s + r.recorrido, 0) / div), contactados: Math.round(recent.reduce((s, r) => s + r.contactados, 0) / div), citas: Math.round(recent.reduce((s, r) => s + r.citas, 0) / div), matriculas: Math.round(recent.reduce((s, r) => s + r.matriculas, 0) / div) };
    const last = base.reduce((m, r) => Math.max(m, parseInt(r.name.replace(/\D/g, ""), 10) || 0), 0);
    const projected = Array.from({ length: 4 }, (_, i) => ({ name: `Semana ${last + i + 1}`, ...avg, matriculasSinCita: 0, contactabilidad: pct(avg.contactados, avg.recorrido), citaContactado: pct(avg.citas, avg.contactados), citaMatricula: pct(avg.matriculas, avg.citas), convFinal: pct(avg.matriculas, avg.recorrido), projected: true }));
    return { historical: base, projected, monthly: avg };
  }, [weekRows]);

  // ── Charts ──────────────────────────────────────────────────────────────────

  const funnelOption = useMemo(() => {
    const top = agentRows.slice(0, 10).reverse();
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
      legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
      grid: { left: 110, right: 22, top: 36, bottom: 18 },
      xAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
      yAxis: { type: "category", data: top.map((r) => r.name.split(" ").slice(0, 2).join(" ")), axisLabel: { color: "#c0c0d8", fontSize: 11 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
      series: [
        { name: "Recorridos", type: "bar", data: top.map((r) => r.recorrido), itemStyle: { color: colors.blue } },
        { name: "Contactados", type: "bar", data: top.map((r) => r.contactados), itemStyle: { color: colors.cyan } },
        { name: "Citas", type: "bar", data: top.map((r) => r.citas), itemStyle: { color: colors.amber } },
        { name: "Matrículas", type: "bar", data: top.map((r) => r.matriculas), itemStyle: { color: colors.green } },
      ],
    };
  }, [agentRows]);

  const regimenDonut = useMemo(() => ({ backgroundColor: "transparent", tooltip: { trigger: "item", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } }, legend: { bottom: 0, textStyle: { color: "#c0c0d8", fontSize: 10 } }, series: [{ name: "Recorridos", type: "pie", radius: ["48%", "72%"], center: ["50%", "43%"], data: regimenRows.map((r) => ({ name: r.name, value: r.recorrido })), label: { color: "#c0c0d8", fontSize: 10 } }] }), [regimenRows]);
  const tipoDonut = useMemo(() => ({ backgroundColor: "transparent", tooltip: { trigger: "item", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } }, legend: { bottom: 0, textStyle: { color: "#c0c0d8", fontSize: 10 } }, series: [{ name: "Leads", type: "pie", radius: ["48%", "72%"], center: ["50%", "43%"], data: tipoRows.map((r) => ({ name: r.name, value: r.recorrido })), label: { color: "#c0c0d8", fontSize: 10 } }] }), [tipoRows]);

  const weeklyOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
    grid: { left: 42, right: 20, top: 42, bottom: 48 },
    xAxis: { type: "category", data: weekRows.map((r) => r.name), axisLabel: { color: "#9090b0", rotate: 35, fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
    series: [
      { name: "Citas", type: "line", smooth: true, data: weekRows.map((r) => r.citas), itemStyle: { color: colors.amber } },
      { name: "Matrículas", type: "line", smooth: true, data: weekRows.map((r) => r.matriculas), itemStyle: { color: colors.green } },
    ],
  }), [weekRows]);

  const monthOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
    grid: { left: 42, right: 20, top: 42, bottom: 34 },
    xAxis: { type: "category", data: monthRows.map((r) => r.name), axisLabel: { color: "#9090b0", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
    series: [
      { name: "Citas", type: "line", smooth: true, data: monthRows.map((r) => r.citas), itemStyle: { color: colors.amber } },
      { name: "Matrículas", type: "line", smooth: true, data: monthRows.map((r) => r.matriculas), itemStyle: { color: colors.green } },
    ],
  }), [monthRows]);

  const carreraMatOption = useMemo(() => {
    const top = allCarreraRows.slice(0, 15).reverse();
    return { backgroundColor: "transparent", tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } }, grid: { left: 150, right: 20, top: 20, bottom: 20 }, xAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } }, yAxis: { type: "category", data: top.map((r) => r.name), axisLabel: { color: "#c0c0d8", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } }, series: [{ name: "Matrículas", type: "bar", data: top.map((r) => r.matriculas), itemStyle: { color: colors.green } }] };
  }, [allCarreraRows]);

  const carreraConvOption = useMemo(() => {
    const top = allCarreraRows.slice(0, 15).reverse();
    return { backgroundColor: "transparent", tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } }, grid: { left: 150, right: 20, top: 20, bottom: 20 }, xAxis: { type: "value", max: 100, splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0", formatter: "{value}%" } }, yAxis: { type: "category", data: top.map((r) => r.name), axisLabel: { color: "#c0c0d8", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } }, series: [{ name: "Conv. Final", type: "bar", data: top.map((r) => r.convFinal), itemStyle: { color: colors.orange } }] };
  }, [allCarreraRows]);

  const regimenOption = useMemo(() => ({ backgroundColor: "transparent", tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } }, legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } }, grid: { left: 90, right: 20, top: 42, bottom: 28 }, xAxis: { type: "category", data: regimenRows.map((r) => r.name), axisLabel: { color: "#9090b0", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } }, yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } }, series: [{ name: "Recorridos", type: "bar", data: regimenRows.map((r) => r.recorrido), itemStyle: { color: colors.blue } }, { name: "Citas", type: "bar", data: regimenRows.map((r) => r.citas), itemStyle: { color: colors.amber } }, { name: "Matrículas", type: "bar", data: regimenRows.map((r) => r.matriculas), itemStyle: { color: colors.green } }] }), [regimenRows]);
  const tipoBaseOption = useMemo(() => ({ backgroundColor: "transparent", tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } }, legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } }, grid: { left: 90, right: 20, top: 42, bottom: 42 }, xAxis: { type: "category", data: tipoRows.map((r) => r.name), axisLabel: { color: "#9090b0", fontSize: 10, rotate: 25 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } }, yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } }, series: [{ name: "Recorridos", type: "bar", data: tipoRows.map((r) => r.recorrido), itemStyle: { color: colors.blue } }, { name: "Citas", type: "bar", data: tipoRows.map((r) => r.citas), itemStyle: { color: colors.amber } }, { name: "Matrículas", type: "bar", data: tipoRows.map((r) => r.matriculas), itemStyle: { color: colors.green } }] }), [tipoRows]);

  const projectionOption = useMemo(() => {
    const all = [...projectionRows.historical, ...projectionRows.projected];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
      legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
      grid: { left: 42, right: 20, top: 42, bottom: 48 },
      xAxis: { type: "category", data: all.map((r) => r.name), axisLabel: { color: "#9090b0", rotate: 35, fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
      series: [
        { name: "Citas", type: "line", smooth: true, data: all.map((r) => r.citas), itemStyle: { color: colors.amber } },
        { name: "Matrículas", type: "line", smooth: true, data: all.map((r) => r.matriculas), itemStyle: { color: colors.green } },
      ],
    };
  }, [projectionRows]);

  // ── States ───────────────────────────────────────────────────────────────────

  if (hydrating) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] text-[#e8e8f0]">Cargando snapshot Diplomados...</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] px-6 text-center text-[#e8e8f0]">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Sin datos para Diplomados</h1>
          <p className="text-sm text-[#9090b0]">Carga el Excel de gestión para visualizar el reporte.</p>
          <DiplomadoUploadPanel onDone={() => { void refreshDataset({ force: true }); }} />
          <div className="pt-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-[#3d3d5c] px-4 py-2 text-sm text-[#9090b0] hover:bg-[#1a1a2e]">
              <ArrowLeft className="size-4" /> Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e8e8f0]">
      <header className="border-b border-[#2d2d44] bg-gradient-to-r from-[#1a1a2e] to-[#0f0f1a] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="rounded-lg border border-[#3d3d5c] p-2 text-[#9090b0] hover:border-[#e8620a] hover:text-[#e8620a]" aria-label="Volver">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#e8620a] text-lg font-black text-white">U</div>
            <div>
              <h1 className="text-lg font-bold">UDLA - Diplomados</h1>
              <p className="text-xs text-[#9090b0]">Dashboard ejecutivo conectado al snapshot de diplomados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DiplomadoUploadPanel onDone={() => { void refreshDataset({ force: true }); }} />
            <div className="rounded-lg border border-[#2d2d44] px-3 py-2 text-xs text-[#9090b0]">
              {formatInt(summary.recorrido)} registros bajo filtros actuales
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        {/* Filters */}
        <div className="rounded-lg border border-[#2d2d44] bg-[#1a1a2e] p-3">
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Mes Gestión" value={filters.mes} options={options.mesGestion} onChange={(v) => setFilters((c) => ({ ...c, mes: v }))} />
            <FilterSelect label="Mes Matrícula" value={filters.mesMatricula} options={options.mesMatricula} onChange={(v) => setFilters((c) => ({ ...c, mesMatricula: v }))} />
            <FilterSelect label="Semana" value={filters.semana} options={options.semana} onChange={(v) => setFilters((c) => ({ ...c, semana: v }))} />
            <FilterSelect label="Carrera / Programa" value={filters.carrera} options={options.carrera} onChange={(v) => setFilters((c) => ({ ...c, carrera: v }))} />
            <FilterSelect label="Régimen" value={filters.regimen} options={options.regimen} onChange={(v) => setFilters((c) => ({ ...c, regimen: v }))} />
            <FilterSelect label="Tipo Base" value={filters.tipoBase} options={options.tipoBase} onChange={(v) => setFilters((c) => ({ ...c, tipoBase: v }))} />
            <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="mt-5 h-9 rounded-lg border border-[#7c2d12] px-3 text-xs font-semibold text-[#fb923c] hover:bg-[#431407]/50">Limpiar</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <KpiCard label="Leads / Registros" value={formatInt(uniqueLeads)} detail={`Gestión: ${formatInt(summary.recorrido)}`} icon={Database} />
          <KpiCard label="Contactados" value={formatInt(summary.contactados)} detail={`${formatPct(pct(summary.contactados, summary.recorrido))} contactabilidad`} icon={PhoneCall} />
          <KpiCard label="No Contactados" value={formatInt(Math.max(summary.recorrido - summary.contactados, 0))} detail="Sin interacción" tone="red" icon={Route} />
          <KpiCard label="Citas (Viene)" value={formatInt(summary.citas)} detail={`${formatPct(pct(summary.citas, summary.contactados))} Cont→Cita`} tone="amber" icon={CalendarDays} />
          <KpiCard label="Matrículas" value={formatInt(summary.matriculas)} detail={`${formatPct(pct(summary.matriculas, summary.citas))} Cita→Mat`} tone="green" icon={Target} />
          <KpiCard label="Conv. Mat / Leads" value={formatPct(pct(summary.matriculas, summary.recorrido))} detail="Conversión total" tone="amber" icon={Target} />
          <KpiCard label="Prom. Intentos" value={promedioIntentos} detail="Por registro" icon={PhoneCall} />
          <KpiCard label="Matrículas sin cita" value={formatInt(summary.matriculasSinCita)} detail={`${formatPct(pct(summary.matriculasSinCita, summary.matriculas))} del total MC`} tone="green" icon={Target} />
          <KpiCard label="Matrícula Cita" value={formatInt(summary.matriculas - summary.matriculasSinCita)} detail={`${formatPct(pct(summary.matriculas - summary.matriculasSinCita, summary.matriculas))} del total MC`} tone="green" icon={Target} />
          <KpiCard label="Conv. Mat / Contactados" value={formatPct(pct(summary.matriculas, summary.contactados))} detail="Matrícula sobre contactados" tone="green" icon={Target} />
          <KpiCard label="Conv. MC Cita / Contactados" value={formatPct(pct(summary.matriculas - summary.matriculasSinCita, summary.contactados))} detail="MC con cita sobre contactados" tone="amber" icon={Target} />
        </div>

        {/* Tabs */}
        <div className="rounded-lg border border-[#2d2d44] bg-[#1a1a2e] p-2">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${activeTab === tab.key ? "border-[#e8620a] bg-[#e8620a] text-white" : "border-transparent text-[#9090b0] hover:bg-[#2d2d44] hover:text-white"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs Tab */}
        {activeTab === "kpis" ? (
          <>
            <SectionCard title="Citas vs Matrícula">
              {(() => {
                const top15 = allCarreraRows.slice(0, 15);
                const globalAvg = top15.length > 0 ? top15.reduce((s, r) => s + r.convFinal, 0) / top15.length : 0;
                const threshold = 0.02;
                const maxCitas = Math.max(...top15.map((r) => r.citas), 1);
                const semaforoColor = (conv: number) => conv >= globalAvg + threshold ? "#4ade80" : conv >= globalAvg - threshold ? "#facc15" : "#f87171";
                const semaforoLabel = (conv: number) => conv >= globalAvg + threshold ? "Sobre promedio" : conv >= globalAvg - threshold ? "Cerca" : "Bajo promedio";
                return (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
                      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4ade80]" />Sobre promedio</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#facc15]" />Cerca</span>
                      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#f87171]" />Bajo promedio</span>
                      <span className="text-[#e8620a]">Umbral: {(globalAvg * 100).toFixed(1)}% (promedio global)</span>
                    </div>
                    <div className="max-h-[320px] overflow-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[#2d2d44] text-[#e8620a]">
                          <tr><th className="px-3 py-2">CARRERA / PROGRAMA</th><th className="px-3 py-2 text-right">CITAS</th><th className="px-3 py-2 text-right">MC</th><th className="px-3 py-2 text-right">CONV.%</th><th className="px-3 py-2">VOL.</th></tr>
                        </thead>
                        <tbody>
                          {top15.map((row) => {
                            const color = semaforoColor(row.convFinal);
                            return (
                              <tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/60">
                                <td className="max-w-[200px] truncate px-3 py-2 font-semibold text-[#e8e8f0]" title={row.name}>{row.name}</td>
                                <td className="px-3 py-2 text-right">{row.citas.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right"><span className="rounded-full border border-[#4ade80] px-2 py-0.5 text-[#4ade80]">{row.matriculas}</span></td>
                                <td className="px-3 py-2 text-right"><span className="flex items-center justify-end gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} title={semaforoLabel(row.convFinal)} /><span style={{ color }}>{(row.convFinal * 100).toFixed(1)}%</span></span></td>
                                <td className="px-3 py-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-[#2d2d44]"><div className="h-2 rounded-full bg-[#e8620a]" style={{ width: `${Math.round((row.citas / maxCitas) * 100)}%` }} /></div></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </SectionCard>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title="Conversión por Régimen">
                <div className="max-h-[230px] overflow-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#2d2d44] text-[#e8620a]">
                      <tr><th className="px-3 py-2">Régimen</th><th className="px-3 py-2">Contactab.</th><th className="px-3 py-2">Cont. a Cita</th><th className="px-3 py-2">Cita a Mat.</th><th className="px-3 py-2">Final</th></tr>
                    </thead>
                    <tbody>
                      {regimenRows.map((row) => (
                        <tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/60">
                          <td className="px-3 py-2 font-semibold text-[#e8e8f0]">{row.name}</td>
                          <td className="px-3 py-2"><span className={`rounded-md px-2 py-1 ${tableTone(row.contactabilidad)}`}>{formatPct(row.contactabilidad)}</span></td>
                          <td className="px-3 py-2">{formatPct(row.citaContactado)}</td>
                          <td className="px-3 py-2">{formatPct(row.citaMatricula)}</td>
                          <td className="px-3 py-2 text-[#4ade80]">{formatPct(row.convFinal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 h-[230px]"><ReactECharts option={regimenDonut} style={{ height: "100%", width: "100%" }} /></div>
              </SectionCard>

              <SectionCard title="Conversión por Tipo Base">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {tipoRows.slice(0, 6).map((row) => (
                    <div key={row.name} className="rounded-lg border border-[#3d3d5c] bg-[#111120] p-3">
                      <div className="truncate text-xs font-bold text-[#e8e8f0]">{row.name}</div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-[#9090b0]">
                        <div><span className="block text-[#e8620a]">{formatInt(row.recorrido)}</span>Rec.</div>
                        <div><span className="block text-[#22d3ee]">{formatPct(row.contactabilidad)}</span>Cont.</div>
                        <div><span className="block text-[#4ade80]">{formatPct(row.convFinal)}</span>Final</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-[260px]"><ReactECharts option={tipoDonut} style={{ height: "100%", width: "100%" }} /></div>
              </SectionCard>
            </div>
          </>
        ) : null}

        {/* Ejecutivos Tab */}
        {activeTab === "ejecutivos" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Recorridos vs Contactados vs Citas vs Matrículas">
              <div className="h-[390px]"><ReactECharts option={funnelOption} style={{ height: "100%", width: "100%" }} /></div>
            </SectionCard>
            <SectionCard title="Ranking Ejecutivos">
              <div className="max-h-[390px] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#2d2d44] text-[#e8620a]">
                    <tr><th className="px-3 py-2">Ejecutivo</th><th className="px-3 py-2">Rec.</th><th className="px-3 py-2">Citas</th><th className="px-3 py-2">MC</th><th className="px-3 py-2">Cont.</th><th className="px-3 py-2">Final</th></tr>
                  </thead>
                  <tbody>
                    {agentRows.map((row) => (
                      <tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/60">
                        <td className="px-3 py-2 font-semibold">{row.name}</td>
                        <td className="px-3 py-2">{formatInt(row.recorrido)}</td>
                        <td className="px-3 py-2">{formatInt(row.citas)}</td>
                        <td className="px-3 py-2 text-[#4ade80]">{formatInt(row.matriculas)}</td>
                        <td className="px-3 py-2">{formatPct(row.contactabilidad)}</td>
                        <td className="px-3 py-2">{formatPct(row.convFinal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {/* Carreras Tab */}
        {activeTab === "carreras" ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title="Matrículas por Carrera / Top 15"><div className="h-[390px]"><ReactECharts option={carreraMatOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
              <SectionCard title="Conversión por Carrera / Top 15"><div className="h-[390px]"><ReactECharts option={carreraConvOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            </div>
            <SectionCard title="Tabla por Carrera / Programa">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#2d2d44] text-[#e8620a]">
                    <tr><th className="px-3 py-2">Carrera</th><th className="px-3 py-2">Rec.</th><th className="px-3 py-2">Citas</th><th className="px-3 py-2">MC</th><th className="px-3 py-2">MC sin cita</th><th className="px-3 py-2">Final</th></tr>
                  </thead>
                  <tbody>
                    {allCarreraRows.map((row) => (
                      <tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/60">
                        <td className="px-3 py-2 font-semibold">{row.name}</td>
                        <td className="px-3 py-2">{formatInt(row.recorrido)}</td>
                        <td className="px-3 py-2">{formatInt(row.citas)}</td>
                        <td className="px-3 py-2 text-[#4ade80]">{formatInt(row.matriculas)}</td>
                        <td className="px-3 py-2">{formatInt(row.matriculasSinCita)}</td>
                        <td className="px-3 py-2">{formatPct(row.convFinal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}

        {/* Régimen Tab */}
        {activeTab === "regimen" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Volumen y Conversión por Régimen"><div className="h-[390px]"><ReactECharts option={regimenOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            <SectionCard title="Tabla por Régimen">
              <div className="space-y-3">
                {regimenRows.map((row) => (
                  <div key={row.name} className="rounded-lg border border-[#2d2d44] bg-[#111120] p-3">
                    <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{row.name}</span><span className="text-[#4ade80]">{formatInt(row.matriculas)} MC</span></div>
                    {percentBar(row.convFinal, "green")}
                    <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-[#9090b0]">
                      <span>Rec. {formatInt(row.recorrido)}</span>
                      <span>Cont. {formatPct(row.contactabilidad)}</span>
                      <span>Cita→Mat {formatPct(row.citaMatricula)}</span>
                      <span>Final {formatPct(row.convFinal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {/* Tipo Base Tab */}
        {activeTab === "tipoBase" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Volumen por Tipo de Base"><div className="h-[360px]"><ReactECharts option={tipoBaseOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            <SectionCard title="Distribuciones de Gestión">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {([["Conecta / No Conecta", conectaRows], ["Interesa", interesaRows]] as const).map(([title, data]) => (
                  <div key={title} className="rounded-lg border border-[#2d2d44] bg-[#111120] p-3">
                    <div className="mb-3 text-xs font-bold uppercase text-[#e8620a]">{title}</div>
                    <div className="space-y-2">{data.slice(0, 8).map((r) => (<div key={r.name} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-[#c0c0d8]">{r.name}</span><span className="font-bold text-white">{formatInt(r.value)}</span></div>))}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {/* Temporal Tab */}
        {activeTab === "temporal" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Evolución por Mes"><div className="h-[390px]"><ReactECharts option={monthOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            <SectionCard title="Evolución por Semana"><div className="h-[390px]"><ReactECharts option={weeklyOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
          </div>
        ) : null}

        {/* Proyecciones Tab */}
        {activeTab === "proyecciones" ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <KpiCard label="Proyección mensual citas" value={formatInt(projectionRows.monthly.citas * 4)} detail="Promedio últimas 4 semanas x 4" tone="amber" icon={CalendarDays} />
              <KpiCard label="Proyección mensual matrículas" value={formatInt(projectionRows.monthly.matriculas * 4)} detail="Promedio últimas 4 semanas x 4" tone="green" icon={Target} />
            </div>
            <SectionCard title="Proyección Semanal Detallada"><div className="h-[390px]"><ReactECharts option={projectionOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
          </>
        ) : null}

      </main>
    </div>
  );
}
