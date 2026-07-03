"use client";

import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, BarChart3, CalendarDays, Database, PhoneCall, Route, Target, Users } from "lucide-react";
import { useMemo, useState } from "react";

import type { DataRow } from "@/lib/data-processing/types";
import { formatInt } from "@/lib/utils/format";
import { normalizeRut } from "@/lib/utils/rut";
import { useData } from "@/features/dashboard/hooks/useData";

type Counts = {
  recorrido: number;
  contactados: number;
  citas: number;
  afluencias: number;
  matriculas: number;
  afluenciasSinCita: number;
  matriculasSinCita: number;
};

type GroupRow = Counts & {
  name: string;
  convFinal: number;
  contactabilidad: number;
  citaContactado: number;
  matAfluencia: number;
};

type TabKey = "kpis" | "ejecutivos" | "carreras" | "regimen" | "tipoBase" | "temporal" | "causaRaiz" | "proyecciones" | "conclusiones";

type ProjectionComparisonRow = {
  month: string;
  citas2025: number;
  afluencias2025: number;
  matriculas2025: number;
  citas2026: number;
  afluencias2026: number;
  matriculas2026: number;
  varCitas: number;
  varAfluencias: number;
  varMatriculas: number;
};

type ProjectionDetailRow = {
  mes: string;
  recorrido2025: number;
  contactado2025: number;
  citas2025: number;
  a2025: number;
  mc2025: number;
  recorrido2026: number;
  contactado2026: number;
  metaCitas2026: number;
  realCitas2026: number;
  metaA2026: number;
  realA2026: number;
  metaMc2026: number;
  realMc2026: number;
  pctCitas: number;
  pctCitasReal: number;
  pctA: number;
  pctAReal: number;
  pctMc: number;
  pctMcReal: number;
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
    afluenciasSinCita: 0,
    matriculasSinCita: 0,
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

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "kpis", label: "KPIs" },
  { key: "ejecutivos", label: "Ejecutivos" },
  { key: "carreras", label: "Carreras" },
  { key: "regimen", label: "Régimen" },
  { key: "tipoBase", label: "Tipo Base" },
  { key: "temporal", label: "Temporal" },
  { key: "causaRaiz", label: "Causa Raíz" },
  { key: "proyecciones", label: "Proyecciones" },
];

const PROJECTION_COMPARISON: ProjectionComparisonRow[] = [
  { month: "Total", citas2025: 5636, afluencias2025: 927, matriculas2025: 404, citas2026: 7364, afluencias2026: 1359, matriculas2026: 632, varCitas: 30.7, varAfluencias: 46.6, varMatriculas: 56.4 },
  { month: "Marzo", citas2025: 1585, afluencias2025: 355, matriculas2025: 125, citas2026: 1051, afluencias2026: 181, matriculas2026: 93, varCitas: -33.7, varAfluencias: -49.0, varMatriculas: -25.6 },
  { month: "Abril", citas2025: 745, afluencias2025: 70, matriculas2025: 31, citas2026: 2463, afluencias2026: 440, matriculas2026: 214, varCitas: 230.6, varAfluencias: 528.6, varMatriculas: 590.3 },
  { month: "Mayo", citas2025: 1608, afluencias2025: 214, matriculas2025: 119, citas2026: 2057, afluencias2026: 403, matriculas2026: 154, varCitas: 27.9, varAfluencias: 88.3, varMatriculas: 29.4 },
  { month: "Junio", citas2025: 1698, afluencias2025: 288, matriculas2025: 129, citas2026: 1793, afluencias2026: 335, matriculas2026: 171, varCitas: 5.6, varAfluencias: 16.3, varMatriculas: 32.6 },
];

const PROJECTION_DETAIL: ProjectionDetailRow[] = [
  { mes: "Total", recorrido2025: 94785, contactado2025: 49042, citas2025: 5636, a2025: 927, mc2025: 404, recorrido2026: 95249, contactado2026: 31467, metaCitas2026: 6763, realCitas2026: 7452, metaA2026: 1112, realA2026: 1394, metaMc2026: 485, realMc2026: 659, pctCitas: 20.0, pctCitasReal: 10.0, pctA: 20.0, pctAReal: 25.0, pctMc: 20.0, pctMcReal: 36.0 },
  { mes: "Marzo", recorrido2025: 22121, contactado2025: 14457, citas2025: 1585, a2025: 355, mc2025: 125, recorrido2026: 19967, contactado2026: 5901, metaCitas2026: 1902, realCitas2026: 1051, metaA2026: 426, realA2026: 181, metaMc2026: 150, realMc2026: 93, pctCitas: 20.0, pctCitasReal: -44.7, pctA: 20.0, pctAReal: -57.5, pctMc: 20.0, pctMcReal: -38.0 },
  { mes: "Abril", recorrido2025: 17232, contactado2025: 9823, citas2025: 745, a2025: 70, mc2025: 31, recorrido2026: 29849, contactado2026: 12174, metaCitas2026: 894, realCitas2026: 2463, metaA2026: 84, realA2026: 440, metaMc2026: 37, realMc2026: 214, pctCitas: 20.0, pctCitasReal: 175.5, pctA: 20.0, pctAReal: 423.8, pctMc: 20.0, pctMcReal: 475.3 },
  { mes: "Mayo", recorrido2025: 27547, contactado2025: 10396, citas2025: 1608, a2025: 214, mc2025: 119, recorrido2026: 23716, contactado2026: 8278, metaCitas2026: 1930, realCitas2026: 2057, metaA2026: 257, realA2026: 403, metaMc2026: 143, realMc2026: 154, pctCitas: 20.0, pctCitasReal: 6.6, pctA: 20.0, pctAReal: 56.9, pctMc: 20.0, pctMcReal: 7.8 },
  { mes: "Junio", recorrido2025: 27885, contactado2025: 14366, citas2025: 1698, a2025: 288, mc2025: 129, recorrido2026: 21717, contactado2026: 5114, metaCitas2026: 2038, realCitas2026: 1881, metaA2026: 346, realA2026: 370, metaMc2026: 155, realMc2026: 198, pctCitas: 20.0, pctCitasReal: -7.7, pctA: 20.0, pctAReal: 7.1, pctMc: 20.0, pctMcReal: 27.9 },
];

function pct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function formatPct(value: number) {
  return `${value}%`;
}

function formatSignedPct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
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

/** Ejecutivos excluidos por mes específico (datos incorrectos o ajuste manual). */
function isAgentExcluded(row: DataRow): boolean {
  const agente = (row.agente ?? "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const mes = getGestionMes(row).toLowerCase();
  // LUISA ELIANA SARAG excluida en junio de todos los indicadores
  if (agente.includes("LUISA ELIANA SARAG") && mes === "junio") return true;
  return false;
}

function buildGestionRows(rows: DataRow[], filters: CallCenterFilters) {
  return rows.filter((row) => {
    if (isAgentExcluded(row)) return false;
    if (filters.mes && getGestionMes(row) !== filters.mes) return false;
    if (filters.semana && row.semana !== filters.semana) return false;
    return matchesSharedFilters(row, filters, { includeSeguimiento: true });
  });
}

function buildMatriculaRows(rows: DataRow[], filters: CallCenterFilters) {
  return rows.filter((row) => {
    if (isAgentExcluded(row)) return false;
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
  counts.afluenciasSinCita = md.filter((row) => isAfluenciaHtml(row) && !isCitaHtml(row)).length;
  counts.matriculasSinCita = md.filter((row) => isMatriculaHtml(row) && !isCitaHtml(row)).length;

  return counts;
}

function countUniqueRuts(rows: DataRow[], predicate?: (row: DataRow) => boolean) {
  const ruts = new Set<string>();
  for (const row of rows) {
    if (predicate && !predicate(row)) continue;
    const rut = normalizeRut(row.rutBase);
    if (rut) ruts.add(rut);
  }
  return ruts.size;
}

function buildGroupRows(
  d: DataRow[],
  md: DataRow[],
  getName: (row: DataRow) => string,
): GroupRow[] {
  const g = new Map<string, Pick<Counts, "recorrido" | "contactados" | "citas">>();
  const m = new Map<string, Pick<Counts, "afluencias" | "matriculas" | "afluenciasSinCita" | "matriculasSinCita">>();

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
    const current = m.get(name) ?? { afluencias: 0, matriculas: 0, afluenciasSinCita: 0, matriculasSinCita: 0 };
    if (isAfluenciaHtml(row)) current.afluencias += 1;
    if (isMatriculaHtml(row)) current.matriculas += 1;
    if (isAfluenciaHtml(row) && !isCitaHtml(row)) current.afluenciasSinCita += 1;
    if (isMatriculaHtml(row) && !isCitaHtml(row)) current.matriculasSinCita += 1;
    m.set(name, current);
  }

  return Array.from(new Set([...g.keys(), ...m.keys()]))
    .map((name) => {
      const gestion = g.get(name) ?? { recorrido: 0, contactados: 0, citas: 0 };
      const matricula = m.get(name) ?? { afluencias: 0, matriculas: 0, afluenciasSinCita: 0, matriculasSinCita: 0 };
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
    .filter((row) => row.recorrido > 0)
    .sort((a, b) => b.recorrido - a.recorrido || b.matriculas - a.matriculas || a.name.localeCompare(b.name, "es"));
}

function buildValueRows(rows: DataRow[], getName: (row: DataRow) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = getName(row);
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "es"));
}

function percentBar(value: number, tone: keyof typeof colors = "orange") {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#2d2d44]">
      <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: colors[tone] }} />
    </div>
  );
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
  const [activeTab, setActiveTab] = useState<TabKey>("kpis");
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
  const uniqueLeads = useMemo(() => countUniqueRuts(gestionRows), [gestionRows]);
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

  /** Semáforo por ejecutivo: top-tercio verde, medio amarillo, bajo rojo (base: MC cita / Contactados) */
  const agentSemaphore = useMemo(() => {
    const withRate = agentRows.map((r) => ({
      name: r.name,
      rate: pct(r.matriculas - r.matriculasSinCita, r.contactados),
    }));
    const sorted = [...withRate].sort((a, b) => b.rate - a.rate);
    const n = sorted.length;
    const topEnd = Math.ceil(n / 3);
    const midEnd = Math.ceil((2 * n) / 3);
    const map = new Map<string, string>();
    sorted.forEach((r, i) => {
      map.set(r.name, i < topEnd ? "#4ade80" : i < midEnd ? "#facc15" : "#f87171");
    });
    return map;
  }, [agentRows]);

  /** Ranking ordenado: verdes primero, luego amarillos, luego rojos; dentro de cada grupo por MC cita/Cont desc */
  const agentRowsRanked = useMemo(() => {
    const colorOrder: Record<string, number> = { "#4ade80": 0, "#facc15": 1, "#f87171": 2 };
    return [...agentRows].sort((a, b) => {
      const ca = colorOrder[agentSemaphore.get(a.name) ?? "#facc15"] ?? 1;
      const cb = colorOrder[agentSemaphore.get(b.name) ?? "#facc15"] ?? 1;
      if (ca !== cb) return ca - cb;
      const rateA = pct(a.matriculas - a.matriculasSinCita, a.contactados);
      const rateB = pct(b.matriculas - b.matriculasSinCita, b.contactados);
      return rateB - rateA || b.matriculas - a.matriculas;
    });
  }, [agentRows, agentSemaphore]);
  const regimenRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.regimen, "Sin régimen")),
    [gestionRows, matriculaRows],
  );
  const tipoRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.tipoBase, "Sin tipo")),
    [gestionRows, matriculaRows],
  );
  const allCarreraRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.carreraInteres, "Sin carrera")).sort((a, b) => b.matriculas - a.matriculas || b.recorrido - a.recorrido),
    [gestionRows, matriculaRows],
  );
  const subOrigenRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.subOrigen, "Sin sub origen")),
    [gestionRows, matriculaRows],
  );
  const seguimientoRows = useMemo(
    () => buildValueRows(gestionRows, (row) => normalizeLabel(row.seguimiento, "Sin seguimiento")),
    [gestionRows],
  );
  const conectaRows = useMemo(
    () => buildValueRows(gestionRows, (row) => normalizeLabel(row.conecta, "Sin conecta")),
    [gestionRows],
  );
  const interesaRows = useMemo(
    () => buildValueRows(gestionRows, (row) => normalizeLabel(row.interesa, "Sin interesa")),
    [gestionRows],
  );
  const weekRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(row.semana, "Sin semana"))
      .sort((a, b) => (parseInt(a.name.replace(/\D/g, ""), 10) || 0) - (parseInt(b.name.replace(/\D/g, ""), 10) || 0)),
    [gestionRows, matriculaRows],
  );
  const monthRows = useMemo(
    () => buildGroupRows(gestionRows, matriculaRows, (row) => normalizeLabel(getGestionMes(row), "Sin mes"))
      .sort((a, b) => MESES_ES.indexOf(a.name) - MESES_ES.indexOf(b.name)),
    [gestionRows, matriculaRows],
  );

  const projectionRows = useMemo(() => {
    const base = weekRows.filter((row) => row.name !== "Sin semana");
    const recent = base.slice(-4);
    const divisor = recent.length || 1;
    const avg = {
      recorrido: Math.round(recent.reduce((acc, row) => acc + row.recorrido, 0) / divisor),
      contactados: Math.round(recent.reduce((acc, row) => acc + row.contactados, 0) / divisor),
      citas: Math.round(recent.reduce((acc, row) => acc + row.citas, 0) / divisor),
      afluencias: Math.round(recent.reduce((acc, row) => acc + row.afluencias, 0) / divisor),
      matriculas: Math.round(recent.reduce((acc, row) => acc + row.matriculas, 0) / divisor),
    };
    const lastNumber = base.reduce((max, row) => Math.max(max, parseInt(row.name.replace(/\D/g, ""), 10) || 0), 0);
    const projected = Array.from({ length: 4 }, (_, index) => ({
      name: `Semana ${lastNumber + index + 1}`,
      ...avg,
      afluenciasSinCita: 0,
      matriculasSinCita: 0,
      contactabilidad: pct(avg.contactados, avg.recorrido),
      citaContactado: pct(avg.citas, avg.contactados),
      matAfluencia: pct(avg.matriculas, avg.citas),
      convFinal: pct(avg.matriculas, avg.recorrido),
      projected: true,
    }));
    return { historical: base, projected, monthly: avg };
  }, [weekRows]);

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

  const monthOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
    grid: { left: 42, right: 20, top: 42, bottom: 34 },
    xAxis: { type: "category", data: monthRows.map((row) => row.name), axisLabel: { color: "#9090b0", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
    series: [
      { name: "Citas", type: "line", smooth: true, data: monthRows.map((row) => row.citas), itemStyle: { color: colors.amber } },
      { name: "Afluencias", type: "line", smooth: true, data: monthRows.map((row) => row.afluencias), itemStyle: { color: colors.orange } },
      { name: "Matrículas", type: "line", smooth: true, data: monthRows.map((row) => row.matriculas), itemStyle: { color: colors.green } },
    ],
  }), [monthRows]);

  const carreraMatOption = useMemo(() => {
    const top = allCarreraRows.slice(0, 15).reverse();
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
      grid: { left: 150, right: 20, top: 20, bottom: 20 },
      xAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
      yAxis: { type: "category", data: top.map((row) => row.name), axisLabel: { color: "#c0c0d8", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
      series: [{ name: "Matrículas", type: "bar", data: top.map((row) => row.matriculas), itemStyle: { color: colors.green } }],
    };
  }, [allCarreraRows]);

  const carreraConvOption = useMemo(() => {
    const top = allCarreraRows.slice(0, 15).reverse();
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
      grid: { left: 150, right: 20, top: 20, bottom: 20 },
      xAxis: { type: "value", max: 100, splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0", formatter: "{value}%" } },
      yAxis: { type: "category", data: top.map((row) => row.name), axisLabel: { color: "#c0c0d8", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
      series: [{ name: "Conv. Final", type: "bar", data: top.map((row) => row.convFinal), itemStyle: { color: colors.orange } }],
    };
  }, [allCarreraRows]);

  const regimenOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
    grid: { left: 90, right: 20, top: 42, bottom: 28 },
    xAxis: { type: "category", data: regimenRows.map((row) => row.name), axisLabel: { color: "#9090b0", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
    series: [
      { name: "Recorridos", type: "bar", data: regimenRows.map((row) => row.recorrido), itemStyle: { color: colors.blue } },
      { name: "Citas", type: "bar", data: regimenRows.map((row) => row.citas), itemStyle: { color: colors.amber } },
      { name: "Matrículas", type: "bar", data: regimenRows.map((row) => row.matriculas), itemStyle: { color: colors.green } },
    ],
  }), [regimenRows]);

  const tipoBaseOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
    grid: { left: 90, right: 20, top: 42, bottom: 42 },
    xAxis: { type: "category", data: tipoRows.map((row) => row.name), axisLabel: { color: "#9090b0", fontSize: 10, rotate: 25 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
    series: [
      { name: "Recorridos", type: "bar", data: tipoRows.map((row) => row.recorrido), itemStyle: { color: colors.blue } },
      { name: "Citas", type: "bar", data: tipoRows.map((row) => row.citas), itemStyle: { color: colors.amber } },
      { name: "Matrículas", type: "bar", data: tipoRows.map((row) => row.matriculas), itemStyle: { color: colors.green } },
    ],
  }), [tipoRows]);

  const subOrigenOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "item", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    legend: { bottom: 0, textStyle: { color: "#c0c0d8", fontSize: 10 } },
    series: [{ name: "Sub Origen", type: "pie", radius: ["45%", "70%"], center: ["50%", "43%"], data: subOrigenRows.slice(0, 8).map((row) => ({ name: row.name, value: row.recorrido })), label: { color: "#c0c0d8", fontSize: 10 } }],
  }), [subOrigenRows]);

  const distributionOption = useMemo(() => ({
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
    grid: { left: 140, right: 20, top: 20, bottom: 20 },
    xAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
    yAxis: { type: "category", data: seguimientoRows.slice(0, 10).reverse().map((row) => row.name), axisLabel: { color: "#c0c0d8", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
    series: [{ name: "Registros", type: "bar", data: seguimientoRows.slice(0, 10).reverse().map((row) => row.value), itemStyle: { color: colors.orange } }],
  }), [seguimientoRows]);

  const projectionOption = useMemo(() => {
    const rowsProjected = [...projectionRows.historical, ...projectionRows.projected];
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
      legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
      grid: { left: 42, right: 20, top: 42, bottom: 48 },
      xAxis: { type: "category", data: rowsProjected.map((row) => row.name), axisLabel: { color: "#9090b0", rotate: 35, fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
      series: [
        { name: "Citas", type: "line", smooth: true, data: rowsProjected.map((row) => row.citas), itemStyle: { color: colors.amber } },
        { name: "Afluencias", type: "line", smooth: true, data: rowsProjected.map((row) => row.afluencias), itemStyle: { color: colors.orange }, lineStyle: { type: "dashed" } },
        { name: "Matrículas", type: "line", smooth: true, data: rowsProjected.map((row) => row.matriculas), itemStyle: { color: colors.green } },
      ],
    };
  }, [projectionRows]);

  const comparisonOption = useMemo(() => {
    const rowsComparison = PROJECTION_COMPARISON.filter((row) => row.month !== "Total");
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(15,15,26,0.96)", borderColor: "#3d3d5c", textStyle: { color: "#e8e8f0" } },
      legend: { top: 0, textStyle: { color: "#c0c0d8", fontSize: 11 } },
      grid: { left: 42, right: 20, top: 42, bottom: 36 },
      xAxis: { type: "category", data: rowsComparison.map((row) => row.month), axisLabel: { color: "#9090b0", fontSize: 10 }, axisLine: { lineStyle: { color: "#2d2d44" } }, axisTick: { show: false } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "#2d2d44" } }, axisLabel: { color: "#9090b0" } },
      series: [
        { name: "Citas 202520", type: "bar", data: rowsComparison.map((row) => row.citas2025), itemStyle: { color: "#b45309" } },
        { name: "Citas 202620", type: "bar", data: rowsComparison.map((row) => row.citas2026), itemStyle: { color: colors.amber } },
        { name: "AF 202520", type: "line", smooth: true, data: rowsComparison.map((row) => row.afluencias2025), itemStyle: { color: "#3b82f6" }, lineStyle: { color: "#3b82f6", width: 2 }, symbol: "circle", symbolSize: 6 },
        { name: "AF 202620", type: "line", smooth: true, data: rowsComparison.map((row) => row.afluencias2026), itemStyle: { color: "#93c5fd" }, lineStyle: { color: "#93c5fd", width: 2, type: "dashed" }, symbol: "circle", symbolSize: 6 },
        { name: "MC 202520", type: "line", smooth: true, data: rowsComparison.map((row) => row.matriculas2025), itemStyle: { color: "#166534" }, lineStyle: { color: "#166534", width: 2 }, symbol: "circle", symbolSize: 6 },
        { name: "MC 202620", type: "line", smooth: true, data: rowsComparison.map((row) => row.matriculas2026), itemStyle: { color: colors.green }, lineStyle: { color: colors.green, width: 2, type: "dashed" }, symbol: "circle", symbolSize: 6 },
      ],
    };
  }, []);

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
          <div className="flex items-center gap-3">
            <Link href="/diplomado" className="inline-flex items-center gap-2 rounded-lg border border-[#3d3d5c] px-3 py-2 text-xs text-[#9090b0] hover:border-[#e8620a] hover:text-[#e8620a]">
              <BarChart3 className="size-3.5" /> Diplomados
            </Link>
            <div className="rounded-lg border border-[#2d2d44] px-3 py-2 text-xs text-[#9090b0]">
              {formatInt(summary.recorrido)} registros bajo filtros actuales
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        <div className="rounded-lg border border-[#2d2d44] bg-[#1a1a2e] p-3">
          <div className="flex flex-wrap gap-3">
            <FilterSelect label="Mes Gestión" value={filters.mes} options={options.mesGestion} onChange={(value) => setFilters((current) => ({ ...current, mes: value }))} />
            <FilterSelect label="Mes Matrícula" value={filters.mesMatricula} options={options.mesMatricula} onChange={(value) => setFilters((current) => ({ ...current, mesMatricula: value }))} />
            <FilterSelect label="Semana" value={filters.semana} options={options.semana} onChange={(value) => setFilters((current) => ({ ...current, semana: value }))} />
            <FilterSelect label="Carrera" value={filters.carrera} options={options.carrera} onChange={(value) => setFilters((current) => ({ ...current, carrera: value }))} />
            <FilterSelect label="Régimen" value={filters.regimen} options={options.regimen} onChange={(value) => setFilters((current) => ({ ...current, regimen: value }))} />
            <FilterSelect label="Tipo Base" value={filters.tipoBase} options={options.tipoBase} onChange={(value) => setFilters((current) => ({ ...current, tipoBase: value }))} />
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
          <KpiCard label="Leads / Registros" value={formatInt(uniqueLeads)} detail={`Gestión: ${formatInt(summary.recorrido)}`} icon={Database} />
          <KpiCard label="Contactados" value={formatInt(summary.contactados)} detail={`${formatPct(pct(summary.contactados, summary.recorrido))} contactabilidad`} icon={PhoneCall} />
          <KpiCard label="No Contactados" value={formatInt(Math.max(summary.recorrido - summary.contactados, 0))} detail="Sin interacción" tone="red" icon={Route} />
          <KpiCard label="Citas (Viene)" value={formatInt(summary.citas)} detail={`${formatPct(pct(summary.citas, summary.contactados))} Cont→Cita`} tone="amber" icon={CalendarDays} />
          <KpiCard label="Afluencias" value={formatInt(summary.afluencias)} detail="Asistencia efectiva" tone="blue" icon={BarChart3} />
          <KpiCard label="Matrículas" value={formatInt(summary.matriculas)} detail={`${formatPct(pct(summary.matriculas, summary.afluencias))} Af→Mat`} tone="green" icon={Target} />
          <KpiCard label="Conv. Mat / Leads" value={formatPct(pct(summary.matriculas, summary.recorrido))} detail="Conversión total" tone="amber" icon={Target} />
          <KpiCard label="Prom. Intentos" value={promedioIntentos} detail="Por registro" icon={PhoneCall} />
          <KpiCard label="Conv. Cita→Aflu." value={formatPct(pct(summary.afluencias - summary.afluenciasSinCita, summary.citas))} detail="Efectividad cita" tone="blue" icon={CalendarDays} />
          <KpiCard label="Afluencias sin cita" value={formatInt(summary.afluenciasSinCita)} detail={`${formatPct(pct(summary.afluenciasSinCita, summary.afluencias))} del total AF`} tone="blue" icon={CalendarDays} />
          <KpiCard label="Matrículas sin cita" value={formatInt(summary.matriculasSinCita)} detail={`${formatPct(pct(summary.matriculasSinCita, summary.matriculas))} del total MC`} tone="green" icon={Target} />
          <KpiCard label="Afluencia Cita" value={formatInt(summary.afluencias - summary.afluenciasSinCita)} detail={`${formatPct(pct(summary.afluencias - summary.afluenciasSinCita, summary.afluencias))} del total AF`} tone="blue" icon={CalendarDays} />
          <KpiCard label="Conv. Mat / Contactados" value={formatPct(pct(summary.matriculas, summary.contactados))} detail="Matrícula sobre contactados" tone="green" icon={Target} />
          <KpiCard label="Matrícula Cita" value={formatInt(summary.matriculas - summary.matriculasSinCita)} detail={`${formatPct(pct(summary.matriculas - summary.matriculasSinCita, summary.matriculas))} del total MC`} tone="green" icon={Target} />
          <KpiCard label="Conv. MC Cita / Contactados" value={formatPct(pct(summary.matriculas - summary.matriculasSinCita, summary.contactados))} detail="MC con cita sobre contactados" tone="amber" icon={Target} />
        </div>

        <div className="rounded-lg border border-[#2d2d44] bg-[#1a1a2e] p-2">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "border-[#e8620a] bg-[#e8620a] text-white"
                    : "border-transparent text-[#9090b0] hover:bg-[#2d2d44] hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "kpis" ? (
          <>
            <SectionCard title="Citas vs Matrícula">
              {(() => {
                const top15 = allCarreraRows.slice(0, 15);
                const globalAvg = top15.length > 0 ? top15.reduce((s, r) => s + r.convFinal, 0) / top15.length : 0;
                const threshold = 0.02;
                const maxCitas = Math.max(...top15.map((r) => r.citas), 1);
                function semaforoColor(conv: number) {
                  if (conv >= globalAvg + threshold) return "#4ade80";
                  if (conv >= globalAvg - threshold) return "#facc15";
                  return "#f87171";
                }
                function semaforoLabel(conv: number) {
                  if (conv >= globalAvg + threshold) return "Sobre promedio";
                  if (conv >= globalAvg - threshold) return "Cerca";
                  return "Bajo promedio";
                }
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
                          <tr>
                            <th className="px-3 py-2">CARRERA</th>
                            <th className="px-3 py-2 text-right">CITAS</th>
                            <th className="px-3 py-2 text-right">MC</th>
                            <th className="px-3 py-2 text-right">CONV.%</th>
                            <th className="px-3 py-2">VOL.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top15.map((row) => {
                            const color = semaforoColor(row.convFinal);
                            const pct = Math.round((row.citas / maxCitas) * 100);
                            return (
                              <tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/60">
                                <td className="max-w-[200px] truncate px-3 py-2 font-semibold text-[#e8e8f0]" title={row.name}>{row.name}</td>
                                <td className="px-3 py-2 text-right">{row.citas.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className="rounded-full border border-[#4ade80] px-2 py-0.5 text-[#4ade80]">{row.matriculas}</span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className="flex items-center justify-end gap-1.5">
                                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} title={semaforoLabel(row.convFinal)} />
                                    <span style={{ color }}>{(row.convFinal * 100).toFixed(1)}%</span>
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="h-2 w-24 overflow-hidden rounded-full bg-[#2d2d44]">
                                    <div className="h-2 rounded-full bg-[#e8620a]" style={{ width: `${pct}%` }} />
                                  </div>
                                </td>
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
          </>
        ) : null}

        {activeTab === "ejecutivos" ? (
          <div className="grid grid-cols-1 gap-4">
            <SectionCard title="Ranking Ejecutivos">
              <div className="mb-2 flex items-center gap-4 text-[10px] text-[#9090b0]">
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-[#4ade80]" /> Alto desempeño</span>
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-[#facc15]" /> Desempeño medio</span>
                <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-[#f87171]" /> Bajo desempeño</span>
              </div>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#2d2d44] text-[#e8620a]">
                    <tr>
                      <th className="px-3 py-2">Ejecutivo</th>
                      <th className="px-3 py-2 text-right">Rec.</th>
                      <th className="px-3 py-2 text-right">Cont.</th>
                      <th className="px-3 py-2 text-right">Citas</th>
                      <th className="px-3 py-2 text-right">AF cita</th>
                      <th className="px-3 py-2 text-right">AF sin cita</th>
                      <th className="px-3 py-2 text-right">MC cita</th>
                      <th className="px-3 py-2 text-right">MC sin cita</th>
                      <th className="px-3 py-2 text-right">%Cita/Cont</th>
                      <th className="px-3 py-2 text-right">%AF/Cont</th>
                      <th className="px-3 py-2 text-right">%MC/Cont</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRowsRanked.map((row) => {
                      const color = agentSemaphore.get(row.name) ?? "#facc15";
                      const afConCita = row.afluencias - row.afluenciasSinCita;
                      const mcConCita = row.matriculas - row.matriculasSinCita;
                      const tasaCita = pct(row.citas, row.contactados);
                      const tasaAf = pct(afConCita, row.contactados);
                      const tasaMc = pct(mcConCita, row.contactados);
                      return (
                        <tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/40" style={{ borderLeft: `3px solid ${color}` }}>
                          <td className="px-3 py-2 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />
                              {row.name}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-[#9090b0]">{formatInt(row.recorrido)}</td>
                          <td className="px-3 py-2 text-right">{formatInt(row.contactados)}</td>
                          <td className="px-3 py-2 text-right">{formatInt(row.citas)}</td>
                          <td className="px-3 py-2 text-right">{formatInt(afConCita)}</td>
                          <td className="px-3 py-2 text-right text-[#9090b0]">{formatInt(row.afluenciasSinCita)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-[#4ade80]">{formatInt(mcConCita)}</td>
                          <td className="px-3 py-2 text-right text-[#9090b0]">{formatInt(row.matriculasSinCita)}</td>
                          <td className="px-3 py-2 text-right text-[#60a5fa]">{formatPct(tasaCita)}</td>
                          <td className="px-3 py-2 text-right text-[#60a5fa]">{formatPct(tasaAf)}</td>
                          <td className="px-3 py-2 text-right font-bold" style={{ color }}>{formatPct(tasaMc)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === "carreras" ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title="Matrículas por Carrera / Top 15"><div className="h-[390px]"><ReactECharts option={carreraMatOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
              <SectionCard title="Conversión por Carrera / Top 15"><div className="h-[390px]"><ReactECharts option={carreraConvOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            </div>
            <SectionCard title="Tabla por Carrera">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#2d2d44] text-[#e8620a]"><tr><th className="px-3 py-2">Carrera</th><th className="px-3 py-2">Rec.</th><th className="px-3 py-2">Citas</th><th className="px-3 py-2">AF</th><th className="px-3 py-2">MC</th><th className="px-3 py-2">AF sin cita</th><th className="px-3 py-2">MC sin cita</th><th className="px-3 py-2">Final</th></tr></thead>
                  <tbody>{allCarreraRows.map((row) => (<tr key={row.name} className="border-b border-[#2d2d44] hover:bg-[#2d2d44]/60"><td className="px-3 py-2 font-semibold">{row.name}</td><td className="px-3 py-2">{formatInt(row.recorrido)}</td><td className="px-3 py-2">{formatInt(row.citas)}</td><td className="px-3 py-2">{formatInt(row.afluencias)}</td><td className="px-3 py-2 text-[#4ade80]">{formatInt(row.matriculas)}</td><td className="px-3 py-2">{formatInt(row.afluenciasSinCita)}</td><td className="px-3 py-2">{formatInt(row.matriculasSinCita)}</td><td className="px-3 py-2">{formatPct(row.convFinal)}</td></tr>))}</tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}

        {activeTab === "regimen" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Volumen y Conversión por Régimen"><div className="h-[390px]"><ReactECharts option={regimenOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            <SectionCard title="Tabla por Régimen">
              <div className="space-y-3">
                {regimenRows.map((row) => (
                  <div key={row.name} className="rounded-lg border border-[#2d2d44] bg-[#111120] p-3">
                    <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{row.name}</span><span className="text-[#4ade80]">{formatInt(row.matriculas)} MC</span></div>
                    {percentBar(row.convFinal, "green")}
                    <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-[#9090b0]"><span>Rec. {formatInt(row.recorrido)}</span><span>Cont. {formatPct(row.contactabilidad)}</span><span>Cita-AF {formatPct(pct(row.afluencias, row.citas))}</span><span>Final {formatPct(row.convFinal)}</span></div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === "tipoBase" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Volumen por Tipo de Base"><div className="h-[360px]"><ReactECharts option={tipoBaseOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            <SectionCard title="Distribución por Sub Origen"><div className="h-[360px]"><ReactECharts option={subOrigenOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
          </div>
        ) : null}

        {activeTab === "temporal" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Evolución por Mes"><div className="h-[390px]"><ReactECharts option={monthOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            <SectionCard title="Evolución por Semana"><div className="h-[390px]"><ReactECharts option={weeklyOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
          </div>
        ) : null}

        {activeTab === "causaRaiz" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Motivos de No Cita / Seguimiento"><div className="h-[360px]"><ReactECharts option={distributionOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            <SectionCard title="Distribuciones de Gestión">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[["Conecta / No Conecta", conectaRows], ["Interesa", interesaRows]].map(([title, data]) => (
                  <div key={title as string} className="rounded-lg border border-[#2d2d44] bg-[#111120] p-3">
                    <div className="mb-3 text-xs font-bold uppercase text-[#e8620a]">{title as string}</div>
                    <div className="space-y-2">{(data as Array<{ name: string; value: number }>).slice(0, 8).map((row) => (<div key={row.name} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-[#c0c0d8]">{row.name}</span><span className="font-bold text-white">{formatInt(row.value)}</span></div>))}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === "proyecciones" ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <KpiCard label="Proyección mensual citas" value={formatInt(projectionRows.monthly.citas * 4)} detail="Promedio últimas 4 semanas x 4" tone="amber" icon={CalendarDays} />
              <KpiCard label="Proyección mensual afluencias" value={formatInt(projectionRows.monthly.afluencias * 4)} detail="Promedio últimas 4 semanas x 4" tone="blue" icon={BarChart3} />
              <KpiCard label="Proyección mensual matrículas" value={formatInt(projectionRows.monthly.matriculas * 4)} detail="Promedio últimas 4 semanas x 4" tone="green" icon={Target} />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title="Proyección Semanal Detallada"><div className="h-[390px]"><ReactECharts option={projectionOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
              <SectionCard title="Comparativo 202520 vs 202620"><div className="h-[390px]"><ReactECharts option={comparisonOption} style={{ height: "100%", width: "100%" }} /></div></SectionCard>
            </div>
            <SectionCard title="Tabla Comparativa desde Excel">
              <div className="overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#e8620a]">
                    <tr className="bg-[#2d2d44]">
                      <th rowSpan={2} className="px-3 py-2 align-bottom">Mes</th>
                      <th colSpan={5} className="border-l border-[#1a1a2e] px-3 py-2 text-center">202520</th>
                      <th colSpan={8} className="border-l border-[#1a1a2e] px-3 py-2 text-center">202620</th>
                      <th colSpan={6} className="border-l border-[#1a1a2e] px-3 py-2 text-center">Variación 25/26</th>
                    </tr>
                    <tr className="bg-[#2d2d44]/70 text-[#c0c0d8]">
                      <th className="border-l border-[#1a1a2e] px-3 py-2">Recorrido</th>
                      <th className="px-3 py-2">Contactado</th>
                      <th className="px-3 py-2">Citas</th>
                      <th className="px-3 py-2">A</th>
                      <th className="px-3 py-2">Mc</th>
                      <th className="border-l border-[#1a1a2e] px-3 py-2">Recorrido</th>
                      <th className="px-3 py-2">Contactado</th>
                      <th className="px-3 py-2">Meta Citas</th>
                      <th className="px-3 py-2">Real Citas</th>
                      <th className="px-3 py-2">Meta A</th>
                      <th className="px-3 py-2">Real A</th>
                      <th className="px-3 py-2">Meta Mc</th>
                      <th className="px-3 py-2">Real Mc</th>
                      <th className="border-l border-[#1a1a2e] px-3 py-2">% Citas</th>
                      <th className="px-3 py-2">% Citas Real</th>
                      <th className="px-3 py-2">% A</th>
                      <th className="px-3 py-2">% A Real</th>
                      <th className="px-3 py-2">% Mc</th>
                      <th className="px-3 py-2">% Mc Real</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROJECTION_DETAIL.map((row) => (
                      <tr key={row.mes} className={`border-b border-[#2d2d44] hover:bg-[#2d2d44]/60 ${row.mes === "Total" ? "bg-[#2d2d44]/40 font-semibold" : ""}`}>
                        <td className="px-3 py-2 font-semibold">{row.mes}</td>
                        <td className="border-l border-[#2d2d44] px-3 py-2">{formatInt(row.recorrido2025)}</td>
                        <td className="px-3 py-2">{formatInt(row.contactado2025)}</td>
                        <td className="px-3 py-2">{formatInt(row.citas2025)}</td>
                        <td className="px-3 py-2">{formatInt(row.a2025)}</td>
                        <td className="px-3 py-2">{formatInt(row.mc2025)}</td>
                        <td className="border-l border-[#2d2d44] px-3 py-2">{formatInt(row.recorrido2026)}</td>
                        <td className="px-3 py-2">{formatInt(row.contactado2026)}</td>
                        <td className="px-3 py-2">{formatInt(row.metaCitas2026)}</td>
                        <td className="px-3 py-2">{formatInt(row.realCitas2026)}</td>
                        <td className="px-3 py-2">{formatInt(row.metaA2026)}</td>
                        <td className="px-3 py-2">{formatInt(row.realA2026)}</td>
                        <td className="px-3 py-2">{formatInt(row.metaMc2026)}</td>
                        <td className="px-3 py-2">{formatInt(row.realMc2026)}</td>
                        <td className="border-l border-[#2d2d44] px-3 py-2 text-[#9090b0]">{formatSignedPct(row.pctCitas)}</td>
                        <td className={`px-3 py-2 ${row.pctCitasReal >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{formatSignedPct(row.pctCitasReal)}</td>
                        <td className="px-3 py-2 text-[#9090b0]">{formatSignedPct(row.pctA)}</td>
                        <td className={`px-3 py-2 ${row.pctAReal >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{formatSignedPct(row.pctAReal)}</td>
                        <td className="px-3 py-2 text-[#9090b0]">{formatSignedPct(row.pctMc)}</td>
                        <td className={`px-3 py-2 ${row.pctMcReal >= 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>{formatSignedPct(row.pctMcReal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}


        {activeTab === "conclusiones" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard title="Hallazgos Principales">
              <div className="space-y-3 text-sm text-[#c0c0d8]">
                <p>De {formatInt(summary.recorrido)} registros gestionados, {formatInt(summary.contactados)} fueron contactados ({formatPct(pct(summary.contactados, summary.recorrido))}).</p>
                <p>Se generaron {formatInt(summary.citas)} citas y {formatInt(summary.afluencias)} afluencias, con conversión cita a afluencia de {formatPct(pct(summary.afluencias, summary.citas))}.</p>
                <p>{formatInt(summary.afluenciasSinCita)} afluencias y {formatInt(summary.matriculasSinCita)} matrículas no tienen cita previa registrada en el mismo registro.</p>
              </div>
            </SectionCard>
            <SectionCard title="Riesgos y Oportunidades">
              <div className="space-y-3 text-sm text-[#c0c0d8]">
                <p>Si la contactabilidad sube a 70%, el modelo actual proyecta cerca de {formatInt(Math.round(summary.recorrido * 0.7 * (pct(summary.citas, summary.contactados) / 100) * (pct(summary.matriculas, summary.afluencias || 1) / 100)))} matrículas.</p>
                <p>El comparativo 202620 vs 202520 muestra {formatSignedPct(PROJECTION_COMPARISON[0].varCitas)} en citas, {formatSignedPct(PROJECTION_COMPARISON[0].varAfluencias)} en afluencias y {formatSignedPct(PROJECTION_COMPARISON[0].varMatriculas)} en matrículas acumuladas.</p>
                <p>Prioridad operativa: revisar ejecutivos bajo meta, confirmar citas y separar resultados con cita versus llegadas directas.</p>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </main>
    </div>
  );
}
