"use client";

import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, BarChart3, CalendarDays, Database, PhoneCall, Route, Target, Users } from "lucide-react";
import { useMemo, useState } from "react";

import type { DataRow } from "@/lib/data-processing/types";
import { formatInt } from "@/lib/utils/format";
import { useData } from "@/features/dashboard/hooks/useData";

type Counts = {
  recorrido: number;
  contactados: number;
  citas: number;
  afluencias: number;
  matriculas: number;
};

type GroupRow = Counts & {
  name: string;
  convFinal: number;
  contactabilidad: number;
  citaContactado: number;
  matAfluencia: number;
};

const colors = {
  orange: "#e8620a",
  amber: "#facc15",
  green: "#4ade80",
  blue: "#60a5fa",
  red: "#f87171",
  violet: "#a78bfa",
  cyan: "#22d3ee",
};

function emptyCounts(): Counts {
  return {
    recorrido: 0,
    contactados: 0,
    citas: 0,
    afluencias: 0,
    matriculas: 0,
  };
}

const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

type CallCenterFilters = {
  mes: string;
  mesMatricula: string;
  semana: string;
  agente: string;
  carrera: string;
  regimen: string;
  tipoBase: string;
  subOrigen: string;
  seguimiento: string;
};

const EMPTY_FILTERS: CallCenterFilters = {
  mes: "",
  mesMatricula: "",
  semana: "",
  agente: "",
  carrera: "",
  regimen: "",
  tipoBase: "",
  subOrigen: "",
  seguimiento: "",
};

const EMPTY_ROWS: DataRow[] = [];

function pct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function formatPct(value: number) {
  return `${value}%`;
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function getMonthLabel(date: Date | null | undefined) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return MESES_ES[date.getMonth()] ?? null;
}

function getGestionMes(row: DataRow) {
  return row.mesLabel?.trim().toLowerCase() || getMonthLabel(row.fechaGestion) || "";
}

function getMatriculaMes(row: DataRow) {
  return getMonthLabel(row.fechaMatricula) || getMonthLabel(row.fechaAf) || getMonthLabel(row.fechaMc) || "";
}

function getMatriculaValue(row: DataRow) {
  return (row.af || row.mc || "").trim().toUpperCase();
}

function isContactadoHtml(row: DataRow) {
  const interesa = (row.interesa || "").trim();
  const conecta = (row.conecta || "").trim().toLowerCase();
  const contactados = ["Viene", "No Viene", "Volver a llamar", "Volver a Llamar ", "A", "M", "MC"];
  if (contactados.some((value) => interesa === value || interesa.toLowerCase() === value.toLowerCase())) return true;
  return conecta === "conecta";
}

function isCitaHtml(row: DataRow) {
  return (row.interesa || "").trim() === "Viene";
}

function isAfluenciaHtml(row: DataRow) {
  return ["A", "M", "MC"].includes(getMatriculaValue(row));
}

function isMatriculaHtml(row: DataRow) {
  return ["M", "MC"].includes(getMatriculaValue(row));
}

function matchesSharedFilters(row: DataRow, filters: CallCenterFilters, opts?: { includeSeguimiento?: boolean }) {
  if (filters.agente && row.agente !== filters.agente) return false;
  if (filters.carrera && row.carreraInteres !== filters.carrera) return false;
  if (filters.regimen && row.regimen !== filters.regimen) return false;
  if (filters.tipoBase && row.tipoBase !== filters.tipoBase) return false;
  if (filters.subOrigen && row.subOrigen !== filters.subOrigen) return false;
  if (opts?.includeSeguimiento && filters.seguimiento && row.seguimiento !== filters.seguimiento) return false;
  return true;
}

function buildGestionRows(rows: DataRow[], filters: CallCenterFilters) {
  return rows.filter((row) => {
    if (filters.mes && getGestionMes(row) !== filters.mes) return false;
    if (filters.semana && row.semana !== filters.semana) return false;
    return matchesSharedFilters(row, filters, { includeSeguimiento: true });
  });
}

function buildMatriculaRows(rows: DataRow[], filters: CallCenterFilters) {
  return rows.filter((row) => {
    if (!isAfluenciaHtml(row)) return false;
    const mesMatFiltro = filters.mesMatricula || filters.mes;
    if (mesMatFiltro && getMatriculaMes(row) !== mesMatFiltro) return false;
    return matchesSharedFilters(row, filters);
  });
}

function countRows(d: DataRow[], md: DataRow[]): Counts {
  const counts = emptyCounts();

  counts.recorrido = d.length;
  counts.contactados = d.filter(isContactadoHtml).length;
  counts.citas = d.filter(isCitaHtml).length;
  counts.afluencias = md.filter(isAfluenciaHtml).length;
  counts.matriculas = md.filter(isMatriculaHtml).length;

  return counts;
}

function buildGroupRows(
  d: DataRow[],
  md: DataRow[],
  getName: (row: DataRow) => string,
): GroupRow[] {
  const g = new Map<string, Pick<Counts, "recorrido" | "contactados" | "citas">>();
  const m = new Map<string, Pick<Counts, "afluencias" | "matriculas">>();

  for (const row of d) {
    const name = getName(row);
    const current = g.get(name) ?? { recorrido: 0, contactados: 0, citas: 0 };
    current.recorrido += 1;
    if (isContactadoHtml(row)) current.contactados += 1;
    if (isCitaHtml(row)) current.citas += 1;
    g.set(name, current);
  }

  for (const row of md) {
    const name = getName(row);
    const current = m.get(name) ?? { afluencias: 0, matriculas: 0 };
    if (isAfluenciaHtml(row)) current.afluencias += 1;
    if (isMatriculaHtml(row)) current.matriculas += 1;
    m.set(name, current);
  }

  return Array.from(new Set([...g.keys(), ...m.keys()]))
    .map((name) => {
      const gestion = g.get(name) ?? { recorrido: 0, contactados: 0, citas: 0 };
      const matricula = m.get(name) ?? { afluencias: 0, matriculas: 0 };
      const counts = { ...gestion, ...matricula };
      return {
      name,
      ...counts,
      contactabilidad: pct(counts.contactados, counts.recorrido),
      citaContactado: pct(counts.citas, counts.contactados),
      matAfluencia: pct(counts.matriculas, counts.citas),
      convFinal: pct(counts.matriculas, counts.recorrido),
    };
    })
    .filter((row) => row.recorrido > 0 || row.matriculas > 0)
    .sort((a, b) => b.recorrido - a.recorrido || b.matriculas - a.matriculas || a.name.localeCompare(b.name, "es"));
}

function KpiCard({
  label,
  value,
  detail,
  tone = "orange",
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: keyof typeof colors;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-[#2d2d44] bg-[#171725] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#c0c0d8]">{label}</div>
        <Icon className="size-4 text-white/35" />
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums" style={{ color: colors[tone] }}>
        {value}
      </div>
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

function tableTone(value: number) {
  if (value >= 60) return "bg-emerald-500/15 text-emerald-300";
  if (value >= 40) return "bg-yellow-500/15 text-yellow-300";
  return "bg-red-500/15 text-red-300";
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-[150px] flex-1 text-xs text-[#9090b0]">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-[#3d3d5c] bg-[#2d2d44] px-2 text-xs text-[#e8e8f0] outline-none focus:border-[#e8620a]"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CallCenterDashboard() {
  const { dataset, hydrating } = useData();
  const [filters, setFilters] = useState<CallCenterFilters>(EMPTY_FILTERS);
  const rows = useMemo(() => dataset?.rows ?? EMPTY_ROWS, [dataset]);

  const options = useMemo(() => {
    const uniq = (values: Array<string | null | undefined>) => (
      Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value))).sort((a, b) => a.localeCompare(b, "es"))
    );

    const mesGestion = MESES_ES.filter((month) => rows.some((row) => getGestionMes(row) === month));
    const mesMatricula = MESES_ES.filter((month) => rows.some((row) => getMatriculaMes(row) === month));

    return {
      mesGestion,
      mesMatricula,
      semana: uniq(rows.map((row) => row.semana)),
      agente: uniq(rows.map((row) => row.agente)),
      carrera: uniq(rows.map((row) => row.carreraInteres)),
      regimen: uniq(rows.map((row) => row.regimen)),
      tipoBase: uniq(rows.map((row) => row.tipoBase)),
      subOrigen: uniq(rows.map((row) => row.subOrigen)),
      seguimiento: uniq(rows.map((row) => row.seguimiento)),
    };
  }, [rows]);

  const gestionRows = useMemo(() => buildGestionRows(rows, filters), [filters, rows]);
  const matriculaRows = useMemo(() => buildMatriculaRows(rows, filters), [filters, rows]);
  const summary = useMemo(() => countRows(gestionRows, matriculaRows), [gestionRows, matriculaRows]);
  const pendientes = useMemo(
    () => gestionRows.filter((row) => (row.estado || "").toLowerCase().includes("pendiente")).length,
    [gestionRows],
  );
  const promedioIntentos = useMemo(() => {
    const sum = gestionRows.reduce((acc, row) => acc + (parseFloat(row.intentos || "") || 0), 0);
    return gestionRows.length > 0 ? (sum / gestionRows.length).toFixed(1) : "0";
  }, [gestionRows]);

  const agentRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.agente, "Sin ejecutivo")),
    [gestionRows, matriculaRows],
  );
  const regimenRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.regimen, "Sin régimen")),
    [gestionRows, matriculaRows],
  );
  const tipoRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.tipoBase, "Sin tipo")),
    [gestionRows, matriculaRows],
  );
  const carreraRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.carreraInteres, "Sin carrera")).sort((a, b) => b.matriculas - a.matriculas).slice(0, 12),
    [gestionRows, matriculaRows],
  );
  const weekRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.semana, "Sin semana"))
      .sort((a, b) => (parseInt(a.name.replace(/\D/g, ""), 10) || 0) - (parseInt(b.name.replace(/\D/g, ""), 10) || 0)),
    [gestionRows, matriculaRows],
  );

  const funnelOption = useMemo(() => {
    const top = agentRows.slice(0, 10).reverse();
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
      legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
      grid: { left: 110, right: 22, top: 36, bottom: 18 },
      xAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
      yAxis: {
        type: "category",
        data: top.map((row) => row.name.split(" ").slice(0, 2).join(" ")),
        axisLabel: { color: "#c0c0d8", fontSize: 11 },
        axisLine: { lineStyle: { color: "#2d2d44" } },
        axisTick: { show: false },
      },
      series: [
        { name: "Recorridos", type: "bar", data: top.map((row) => row.recorrido), itemStyle: { color: colors.blue } },
        { name: "Contactados", type: "bar", data: top.map((row) => row.contactados), itemStyle: { color: colors.cyan } },
        { name: "Citas", type: "bar", data: top.map((row) => row.citas), itemStyle: { color: colors.amber } },
        { name: "Matrículas", type: "bar", data: top.map((row) => row.matriculas), itemStyle: { color: colors.green } },
      ],
    };
  }, [agentRows]);

  const regimenDonut = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "item", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { bottom: 0, textStyle: { color: "#c0c0d8", fontSize: 10 } },
    series: [{
      name: "Recorridos",
      type: "pie",
      radius: ["48%", "72%"],
      center: ["50%", "43%"],
      data: regimenRows.map((row) => ({ name: row.name, value: row.recorrido })),
      label: { color: "#c0c0d8", fontSize: 10 },
    }],
  }), [regimenRows]);

  const tipoDonut = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "item", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { bottom: 0, textStyle: { color: "#c0c0d8", fontSize: 10 } },
    series: [{
      name: "Leads",
      type: "pie",
      radius: ["48%", "72%"],
      center: ["50%", "43%"],
      data: tipoRows.map((row) => ({ name: row.name, value: row.recorrido })),
      label: { color: "#c0c0d8", fontSize: 10 },
    }],
  }), [tipoRows]);

  const weeklyOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
    grid: { left: 42, right: 20, top: 42, bottom: 48 },
    xAxis: {
      type: "category",
      data: weekRows.map((row) => row.name),
      axisLabel: { color: "#9090b0", rotate: 35, fontSize: 10 },
      axisLine: { lineStyle: { color: "#2d2d44" } },
      axisTick: { show: false },
    },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
    series: [
      { name: "Citas", type: "line", smooth: true, data: weekRows.map((row) => row.citas), itemStyle: { color: colors.amber } },
      { name: "Afluencias", type: "line", smooth: true, data: weekRows.map((row) => row.afluencias), itemStyle: { color: colors.orange } },
      { name: "Matrículas", type: "line", smooth: true, data: weekRows.map((row) => row.matriculas), itemStyle: { color: colors.green } },
    ],
  }), [weekRows]);

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] text-[#e8e8f0]">
        Cargando snapshot...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] px-6 text-center text-[#e8e8f0]">
        <div>
          <h1 className="text-2xl font-bold">Sin datos para esta vista</h1>
          <p className="mt-2 text-sm text-[#9090b0]">Carga un Excel o limpia filtros desde el dashboard principal.</p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#3d3d5c] px-4 py-2 text-sm text-[#e8620a] hover:bg-[#1a1a2e]">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e8e8f0]">
      <header className="border-b border-[#2d2d44] bg-gradient-to-r from-[#1a1a2e] to-[#0f0f1a] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="rounded-lg border border-[#3d3d5c] p-2 text-[#9090b0] hover:border-[#e8620a] hover:text-[#e8620a]" aria-label="Volver al dashboard">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#e8620a] text-lg font-black text-white">
              U
            </div>
            <div>
              <h1 className="text-lg font-bold">UDLA - Call Center Admisión Directa</h1>
              <p className="text-xs text-[#9090b0]">Dashboard ejecutivo conectado al snapshot cargado</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#2d2d44] px-3 py-2 text-xs text-[#9090b0]">
            {formatInt(summary.recorrido)} registros bajo filtros actuales
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        <div className="rounded-lg border border-[#2d2d44] bg-[#1a1a2e] p-3">
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Mes Gestión" value={filters.mes} options={options.mesGestion} onChange={(value) => setFilters((current) => ({ ...current, mes: value }))} />
            <FilterSelect label="Mes Matrícula" value={filters.mesMatricula} options={options.mesMatricula} onChange={(value) => setFilters((current) => ({ ...current, mesMatricula: value }))} />
            <FilterSelect label="Semana" value={filters.semana} options={options.semana} onChange={(value) => setFilters((current) => ({ ...current, semana: value }))} />
            <FilterSelect label="Ejecutivo" value={filters.agente} options={options.agente} onChange={(value) => setFilters((current) => ({ ...current, agente: value }))} />
            <FilterSelect label="Carrera" value={filters.carrera} options={options.carrera} onChange={(value) => setFilters((current) => ({ ...current, carrera: value }))} />
            <FilterSelect label="Régimen" value={filters.regimen} options={options.regimen} onChange={(value) => setFilters((current) => ({ ...current, regimen: value }))} />
            <FilterSelect label="Tipo Base" value={filters.tipoBase} options={options.tipoBase} onChange={(value) => setFilters((current) => ({ ...current, tipoBase: value }))} />
            <FilterSelect label="Sub Origen" value={filters.subOrigen} options={options.subOrigen} onChange={(value) => setFilters((current) => ({ ...current, subOrigen: value }))} />
            <FilterSelect label="Seguimiento" value={filters.seguimiento} options={options.seguimiento} onChange={(value) => setFilters((current) => ({ ...current, seguimiento: value }))} />
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-5 h-9 rounded-lg border border-[#7c2d12] px-3 text-xs font-semibold text-[#fb923c] hover:bg-[#431407]/50"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <KpiCard label="Leads / Registros" value={formatInt(summary.recorrido)} detail="Total" icon={Database} />
          <KpiCard label="Contactados" value={formatInt(summary.contactados)} detail={`${formatPct(pct(summary.contactados, summary.recorrido))} contactabilidad`} icon={PhoneCall} />
          <KpiCard label="No Contactados" value={formatInt(Math.max(summary.recorrido - summary.contactados, 0))} detail="Sin interacción" tone="red" icon={Route} />
          <KpiCard label="Citas (Viene)" value={formatInt(summary.citas)} detail={`${formatPct(pct(summary.citas, summary.contactados))} Cont→Cita`} tone="amber" icon={CalendarDays} />
          <KpiCard label="Afluencias" value={formatInt(summary.afluencias)} detail="Asistencia efectiva" tone="blue" icon={BarChart3} />
          <KpiCard label="Matrículas" value={formatInt(summary.matriculas)} detail={`${formatPct(pct(summary.matriculas, summary.afluencias))} Af→Mat`} tone="green" icon={Target} />
          <KpiCard label="Conv. Mat / Leads" value={formatPct(pct(summary.matriculas, summary.recorrido))} detail="Conversión total" tone="amber" icon={Target} />
          <KpiCard label="Prom. Intentos" value={promedioIntentos} detail="Por registro" icon={PhoneCall} />
          <KpiCard label="Conv. Cita→Aflu." value={formatPct(pct(summary.afluencias, summary.citas))} detail="Efectividad cita" tone="blue" icon={CalendarDays} />
          <KpiCard label="Ejecutivos" value={formatInt(agentRows.filter((row) => row.name !== "Sin ejecutivo").length)} detail="Activos en dataset" icon={Users} />
          <KpiCard label="Carreras" value={formatInt(new Set(gestionRows.map((row) => row.carreraInteres).filter(Boolean)).size)} detail="Gestionadas" icon={BarChart3} />
          <KpiCard label="Pendientes" value={formatInt(pendientes)} detail="Estado pendiente" tone="amber" icon={Database} />
        </div>

        <SectionCard title="Recorridos - Contactados - Citas - Matrículas / Top 10 Ejecutivos">
          <div className="h-[340px]">
            <ReactECharts option={funnelOption} style={{ height: "100%", width: "100%" }} />
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard title="Conversión por Régimen">
            <div className="max-h-[230px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#2d2d44] text-[#e8620a]">
                  <tr>
                    <th className="px-3 py-2">Régimen</th>
                    <th className="px-3 py-2">Contactab.</th>
                    <th className="px-3 py-2">Cont. a Cita</th>
                    <th className="px-3 py-2">Cita a Mat.</th>
                    <th className="px-3 py-2">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {regimenRows.map((row) => (
                    <tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/60">
                      <td className="px-3 py-2 font-semibold text-[#e8e8f0]">{row.name}</td>
                      <td className="px-3 py-2"><span className={`rounded-md px-2 py-1 ${tableTone(row.contactabilidad)}`}>{formatPct(row.contactabilidad)}</span></td>
                      <td className="px-3 py-2">{formatPct(row.citaContactado)}</td>
                      <td className="px-3 py-2">{formatPct(row.matAfluencia)}</td>
                      <td className="px-3 py-2 text-[#4ade80]">{formatPct(row.convFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 h-[230px]">
              <ReactECharts option={regimenDonut} style={{ height: "100%", width: "100%" }} />
            </div>
          </SectionCard>

          <SectionCard title="Contactabilidad y Conversión por Tipo Base">
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
            <div className="mt-4 h-[260px]">
              <ReactECharts option={tipoDonut} style={{ height: "100%", width: "100%" }} />
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard title="Top Carreras por Matrícula">
            <div className="space-y-2">
              {carreraRows.map((row) => (
                <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[#2d2d44] bg-[#111120] px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{row.name}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#2d2d44]">
                      <div className="h-full rounded-full bg-[#e8620a]" style={{ width: `${Math.min(row.convFinal, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs text-[#9090b0]">
                    <div className="font-bold text-[#4ade80]">{formatInt(row.matriculas)} MC</div>
                    <div>{formatPct(row.convFinal)}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Evolución Semanal">
            <div className="h-[390px]">
              <ReactECharts option={weeklyOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
