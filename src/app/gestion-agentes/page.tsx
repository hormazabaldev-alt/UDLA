"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

import { useData } from "@/features/dashboard/hooks/useData";
import {
  NO_ASIGNADO,
  applyAgentFilters,
  collectAgentFilterOptions,
  type AgentFilters,
} from "@/lib/agent-analytics/agentMetrics";
import type { DataRow } from "@/lib/data-processing/types";
import { isAfluenciaValue, isMatriculaValue } from "@/lib/data-processing/predicates";
import { formatInt } from "@/lib/utils/format";
import { isInteresaViene } from "@/lib/utils/interesa";
import { toCampusCode } from "@/lib/utils/campus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterArrayKey = keyof Omit<AgentFilters, "dateFrom" | "dateTo">;

const EMPTY_FILTERS: AgentFilters = {
  dateFrom: "",
  dateTo: "",
  semanas: [],
  regimenes: [],
  sedesInteres: [],
  afValues: [],
  mcValues: [],
  afCampus: [],
  mcCampus: [],
  conecta: [],
  agentes: [],
  marketing5: [],
  codigoBanner: [],
  carreraInteres: [],
};

const AGENT_PREVIEW_ROWS = 12;

type SummaryCounts = {
  recorrido: number;
  conecta: number;
  noConecta: number;
  citas: number;
  af: number;
  mc: number;
};

type PerformanceRow = SummaryCounts & {
  label: string;
  secondary: string;
  tcContReco: number;
  tcCitCont: number;
  tcAfCit: number;
  tcMcAf: number;
  tcMcReco: number;
};

type MetricInputRow = Pick<DataRow, "conecta" | "interesa" | "af" | "mc">;

type MetricKey = "tcContReco" | "tcCitCont" | "tcAfCit" | "tcMcAf" | "tcMcReco";

type QuartileBand = {
  q1: number;
  q3: number;
};

type QuartileMap = Record<MetricKey, QuartileBand>;

function normalizeLabel(value: string | null | undefined): string {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : NO_ASIGNADO;
}

function normalizeCampus(value: string | null | undefined): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return NO_ASIGNADO;
  const code = toCampusCode(normalized);
  return code?.trim() ? code : NO_ASIGNADO;
}

function normalizeConecta(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isConecta(value: string | null | undefined) {
  return normalizeConecta(value) === "conecta";
}

function isNoConecta(value: string | null | undefined) {
  return normalizeConecta(value) === "no conecta";
}

function safeDiv(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function formatPctCard(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPctTable(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function buildPerformanceRow(label: string, secondary: string, counts: SummaryCounts): PerformanceRow {
  return {
    label,
    secondary,
    ...counts,
    tcContReco: safeDiv(counts.conecta, counts.recorrido),
    tcCitCont: safeDiv(counts.citas, counts.conecta),
    tcAfCit: safeDiv(counts.af, counts.citas),
    tcMcAf: safeDiv(counts.mc, counts.af),
    tcMcReco: safeDiv(counts.mc, counts.recorrido),
  };
}

function emptyCounts(): SummaryCounts {
  return {
    recorrido: 0,
    conecta: 0,
    noConecta: 0,
    citas: 0,
    af: 0,
    mc: 0,
  };
}

function addRowToCounts(counts: SummaryCounts, row: MetricInputRow) {
  counts.recorrido += 1;
  if (isConecta(row.conecta)) counts.conecta += 1;
  if (isNoConecta(row.conecta)) counts.noConecta += 1;
  if (isInteresaViene(row.interesa)) counts.citas += 1;
  if (isAfluenciaValue(row.af)) counts.af += 1;
  if (isMatriculaValue(row.mc)) counts.mc += 1;
}

function aggregateByLabel(
  rows: DataRow[],
  getLabel: (row: DataRow) => string,
): PerformanceRow[] {
  const groups = new Map<string, SummaryCounts>();
  for (const row of rows) {
    const label = getLabel(row);
    if (!groups.has(label)) groups.set(label, emptyCounts());
    addRowToCounts(groups.get(label)!, row);
  }

  return Array.from(groups.entries())
    .map(([label, counts]) => buildPerformanceRow(label, "", counts))
    .sort((a, b) => {
      if (b.recorrido !== a.recorrido) return b.recorrido - a.recorrido;
      return b.citas - a.citas;
    });
}

function aggregateByAgent(
  rows: DataRow[],
): PerformanceRow[] {
  const groups = new Map<
    string,
    {
      counts: SummaryCounts;
      marketingCounts: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const agent = normalizeLabel(row.agente);
    const marketing = normalizeLabel(row.marketing5);

    if (!groups.has(agent)) {
      groups.set(agent, {
        counts: emptyCounts(),
        marketingCounts: new Map<string, number>(),
      });
    }

    const current = groups.get(agent)!;
    addRowToCounts(current.counts, row);
    current.marketingCounts.set(marketing, (current.marketingCounts.get(marketing) ?? 0) + 1);
  }

  return Array.from(groups.entries())
    .map(([agent, payload]) => {
      const dominantMarketing = Array.from(payload.marketingCounts.entries()).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], "es");
      })[0]?.[0] ?? NO_ASIGNADO;
      return buildPerformanceRow(agent, dominantMarketing, payload.counts);
    })
    .sort((a, b) => {
      if (b.recorrido !== a.recorrido) return b.recorrido - a.recorrido;
      return b.citas - a.citas;
    });
}

function quantile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (sortedValues.length - 1) * p;
  const floor = Math.floor(index);
  const ceil = Math.ceil(index);
  if (floor === ceil) return sortedValues[floor];
  const ratio = index - floor;
  return sortedValues[floor] + (sortedValues[ceil] - sortedValues[floor]) * ratio;
}

function getQuartiles(rows: PerformanceRow[]): QuartileMap {
  const buildBand = (key: MetricKey): QuartileBand => {
    const values = rows
      .map((row) => row[key])
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    return {
      q1: quantile(values, 0.25),
      q3: quantile(values, 0.75),
    };
  };

  return {
    tcContReco: buildBand("tcContReco"),
    tcCitCont: buildBand("tcCitCont"),
    tcAfCit: buildBand("tcAfCit"),
    tcMcAf: buildBand("tcMcAf"),
    tcMcReco: buildBand("tcMcReco"),
  };
}

function semaforoTone(value: number, band: QuartileBand): "green" | "yellow" | "red" {
  if (band.q3 <= band.q1) return "yellow";
  if (value >= band.q3) return "green";
  if (value <= band.q1) return "red";
  return "yellow";
}

function SemaforoBadge({ value, band }: { value: number; band: QuartileBand }) {
  const tone = semaforoTone(value, band);
  const classes =
    tone === "green"
      ? "border border-emerald-700/60 bg-emerald-500/15 text-emerald-300"
      : tone === "red"
      ? "border border-rose-700/60 bg-rose-500/15 text-rose-300"
      : "border border-amber-700/60 bg-amber-500/15 text-amber-300";

  return (
    <span className={`inline-flex min-w-[70px] justify-center rounded px-2 py-1 text-[11px] font-semibold tabular-nums ${classes}`}>
      {formatPctTable(value)}
    </span>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-md border border-[#1f1f1f] bg-[#050505] p-3 text-white">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/55">{title}</div>
      <div className="mt-1 text-[30px] font-bold leading-none text-[#00d4ff] tabular-nums">{value}</div>
      {subtitle ? <div className="mt-1 text-[10px] text-white/55">{subtitle}</div> : null}
    </div>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-[#2f2f2f] bg-[#0b0b0b] px-2 text-xs text-white outline-none focus:border-[#00d4ff]"
      >
        <option value="__ALL__">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DataSection({
  title,
  labelHeader,
  rows,
  quartiles,
  showSecondary,
  showAF,
  showMC,
  collapsible,
  onToggleCollapse,
}: {
  title: string;
  labelHeader: string;
  rows: PerformanceRow[];
  quartiles: QuartileMap;
  showSecondary: boolean;
  showAF: boolean;
  showMC: boolean;
  collapsible?: {
    collapsed: boolean;
    totalRows: number;
  };
  onToggleCollapse?: () => void;
}) {
  const hasRows = rows.length > 0;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold uppercase tracking-wide text-[#222]">{title}</h2>
        {collapsible && onToggleCollapse && collapsible.totalRows > rows.length ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleCollapse}
            className="h-7 border-[#777] bg-[#ececec] text-[#1a1a1a] hover:bg-[#f4f4f4]"
          >
            {collapsible.collapsed ? (
              <>
                <ChevronDown className="mr-1 size-4" /> Expandir agentes ({formatInt(collapsible.totalRows)})
              </>
            ) : (
              <>
                <ChevronUp className="mr-1 size-4" /> Contraer agentes
              </>
            )}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="overflow-auto rounded border border-[#2a2a2a] bg-[#efefef]">
          <table className="w-full min-w-[620px] border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-left">{labelHeader}</th>
                {showSecondary ? (
                  <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-left">Marketing 5</th>
                ) : null}
                <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">Recorrido</th>
                <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">Conecta</th>
                <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">No conecta</th>
                <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">Citas</th>
                {showAF ? <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">AF</th> : null}
                {showMC ? <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">MC</th> : null}
              </tr>
            </thead>
            <tbody>
              {hasRows ? (
                rows.map((row) => (
                  <tr key={`${title}:${row.label}:${row.secondary}`}>
                    <td className="border border-[#2a2a2a] bg-white/55 px-2 py-1">{row.label}</td>
                    {showSecondary ? (
                      <td className="border border-[#2a2a2a] bg-white/55 px-2 py-1">{row.secondary}</td>
                    ) : null}
                    <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-right tabular-nums">{formatInt(row.recorrido)}</td>
                    <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-right tabular-nums">{formatInt(row.conecta)}</td>
                    <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-right tabular-nums">{formatInt(row.noConecta)}</td>
                    <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-right tabular-nums">{formatInt(row.citas)}</td>
                    {showAF ? (
                      <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-right tabular-nums">{formatInt(row.af)}</td>
                    ) : null}
                    {showMC ? (
                      <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-right tabular-nums">{formatInt(row.mc)}</td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={showSecondary ? (showAF && showMC ? 8 : showAF || showMC ? 7 : 6) : showAF && showMC ? 7 : showAF || showMC ? 6 : 5}
                    className="border border-[#2a2a2a] bg-white/45 px-3 py-2 text-center text-[#555]"
                  >
                    Sin datos para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-auto rounded border border-[#2a2a2a] bg-[#efefef]">
          <table className="w-full min-w-[460px] border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">TC% Cont/Reco.</th>
                <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">TC% Cit/Cont</th>
                {showAF ? <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">TC% AF/Cit</th> : null}
                {showAF && showMC ? <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">TC% MC/AF</th> : null}
                {showMC ? <th className="border border-[#2a2a2a] bg-[#ffc400] px-2 py-1 text-center">TC% MC/Reco.</th> : null}
              </tr>
            </thead>
            <tbody>
              {hasRows ? (
                rows.map((row) => (
                  <tr key={`${title}:pct:${row.label}:${row.secondary}`}>
                    <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-center">
                      <SemaforoBadge value={row.tcContReco} band={quartiles.tcContReco} />
                    </td>
                    <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-center">
                      <SemaforoBadge value={row.tcCitCont} band={quartiles.tcCitCont} />
                    </td>
                    {showAF ? (
                      <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-center">
                        <SemaforoBadge value={row.tcAfCit} band={quartiles.tcAfCit} />
                      </td>
                    ) : null}
                    {showAF && showMC ? (
                      <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-center">
                        <SemaforoBadge value={row.tcMcAf} band={quartiles.tcMcAf} />
                      </td>
                    ) : null}
                    {showMC ? (
                      <td className="border border-[#2a2a2a] bg-white/45 px-2 py-1 text-center">
                        <SemaforoBadge value={row.tcMcReco} band={quartiles.tcMcReco} />
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={showAF && showMC ? 5 : showAF || showMC ? 4 : 2}
                    className="border border-[#2a2a2a] bg-white/45 px-3 py-2 text-center text-[#555]"
                  >
                    Sin datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function GestionAgentesPage() {
  const { dataset, hydrating } = useData();
  const [filters, setFilters] = useState<AgentFilters>(EMPTY_FILTERS);
  const [showAF, setShowAF] = useState(true);
  const [showMC, setShowMC] = useState(true);
  const [agentsCollapsed, setAgentsCollapsed] = useState(true);

  const rows = useMemo(() => dataset?.rows ?? [], [dataset]);
  const options = useMemo(() => collectAgentFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => applyAgentFilters(rows, filters), [rows, filters]);

  const totals = useMemo(() => {
    const counts = emptyCounts();
    for (const row of filteredRows) {
      addRowToCounts(counts, row);
    }
    return {
      ...counts,
      pctConecta: safeDiv(counts.conecta, counts.recorrido),
      pctInteresaSobreConecta: safeDiv(counts.citas, counts.conecta),
    };
  }, [filteredRows]);

  const agentRows = useMemo(() => aggregateByAgent(filteredRows), [filteredRows]);
  const origenRows = useMemo(
    () => aggregateByLabel(filteredRows, (row) => normalizeLabel(row.tipoBase)),
    [filteredRows],
  );
  const semanaRows = useMemo(
    () => aggregateByLabel(filteredRows, (row) => normalizeLabel(row.semana)),
    [filteredRows],
  );
  const regimenRows = useMemo(
    () => aggregateByLabel(filteredRows, (row) => normalizeLabel(row.regimen)),
    [filteredRows],
  );
  const campusRows = useMemo(
    () => aggregateByLabel(filteredRows, (row) => normalizeCampus(row.sedeInteres)),
    [filteredRows],
  );

  const quartilesBySection = useMemo(
    () => ({
      agentes: getQuartiles(agentRows),
      origen: getQuartiles(origenRows),
      semana: getQuartiles(semanaRows),
      regimen: getQuartiles(regimenRows),
      campus: getQuartiles(campusRows),
    }),
    [agentRows, origenRows, semanaRows, regimenRows, campusRows],
  );

  const visibleAgentRows = useMemo(
    () => (agentsCollapsed ? agentRows.slice(0, AGENT_PREVIEW_ROWS) : agentRows),
    [agentRows, agentsCollapsed],
  );

  const setSingleFilter = (key: FilterArrayKey, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "__ALL__" ? [] : [value],
    }));
  };

  const selected = {
    agentes: filters.agentes[0] ?? "__ALL__",
    marketing5: filters.marketing5[0] ?? "__ALL__",
    carreraInteres: filters.carreraInteres[0] ?? "__ALL__",
    semanas: filters.semanas[0] ?? "__ALL__",
    regimenes: filters.regimenes[0] ?? "__ALL__",
  };

  const resetAll = () => {
    setFilters(EMPTY_FILTERS);
    setAgentsCollapsed(true);
  };

  if (hydrating) {
    return (
      <div className="min-h-screen bg-[#d6d6d6] text-[#222] flex items-center justify-center">
        <div className="text-sm text-[#333]">Cargando datos...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-[#d6d6d6] text-[#222] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-bold">Sin datos disponibles</h1>
          <p className="text-sm text-[#555]">Carga un archivo Excel desde el dashboard principal.</p>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#004e66] hover:underline">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#d6d6d6] text-[#111]">
      <div className="mx-auto max-w-[1800px] space-y-4 px-3 py-4 lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-[#333] hover:text-black">
              <ArrowLeft className="size-4" /> Volver al dashboard
            </Link>
            <div className="inline-flex items-center bg-black px-3 py-1.5 text-lg font-bold text-white">
              Gestión de <span className="ml-1 text-[#00d4ff]">Agentes</span>
            </div>
          </div>
          <div className="text-right text-xs text-[#333]">
            Filas filtradas: <span className="font-semibold text-black">{formatInt(filteredRows.length)}</span>
          </div>
        </div>

        <section className="grid gap-2 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
          <div className="rounded-md border border-[#2a2a2a] bg-[#050505] p-3 text-white">
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-white/60">Rango de fechas</div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="h-8 border-[#2f2f2f] bg-[#0b0b0b] text-xs text-white"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="h-8 border-[#2f2f2f] bg-[#0b0b0b] text-xs text-white"
              />
            </div>
            <div className="mt-2 text-[10px] text-white/45">Usa Fecha Gestión; si viene vacía usa Fecha Carga.</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Total gestiones" value={formatInt(totals.recorrido)} />
            <MetricCard title="Conecta" value={formatInt(totals.conecta)} />
            <MetricCard title="Interesa" value={formatInt(totals.citas)} />
            <MetricCard title="% Conecta" value={formatPctCard(totals.pctConecta)} />
            <MetricCard title="% Interesa / Conecta" value={formatPctCard(totals.pctInteresaSobreConecta)} />
          </div>

          <div className="rounded-md border border-[#2a2a2a] bg-[#050505] p-3 text-white">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">Campos variables</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-white/70">Agregar</span>
              <button
                type="button"
                onClick={() => setShowAF((prev) => !prev)}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  showAF ? "bg-lime-400 text-black" : "bg-white/10 text-white/70"
                }`}
              >
                AF
              </button>
              <button
                type="button"
                onClick={() => setShowMC((prev) => !prev)}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  showMC ? "bg-lime-400 text-black" : "bg-white/10 text-white/70"
                }`}
              >
                MC
              </button>
            </div>
            <div className="mt-3 space-y-1 text-[11px] text-white/65">
              <div><span className="text-emerald-300">Verde</span>: objetivo alcanzado.</div>
              <div><span className="text-amber-300">Amarillo</span>: cercano a la meta.</div>
              <div><span className="text-rose-300">Rojo</span>: bajo desempeño.</div>
            </div>
          </div>
        </section>

        <section className="grid gap-2 rounded-md border border-[#2a2a2a] bg-[#050505] p-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterSelect
            label="Agente"
            options={options.agentes}
            value={selected.agentes}
            onChange={(value) => setSingleFilter("agentes", value)}
          />
          <FilterSelect
            label="Marketing 5"
            options={options.marketing5}
            value={selected.marketing5}
            onChange={(value) => setSingleFilter("marketing5", value)}
          />
          <FilterSelect
            label="Carrera interés"
            options={options.carreraInteres}
            value={selected.carreraInteres}
            onChange={(value) => setSingleFilter("carreraInteres", value)}
          />
          <FilterSelect
            label="Semana"
            options={options.semanas}
            value={selected.semanas}
            onChange={(value) => setSingleFilter("semanas", value)}
          />
          <FilterSelect
            label="Régimen"
            options={options.regimenes}
            value={selected.regimenes}
            onChange={(value) => setSingleFilter("regimenes", value)}
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={resetAll}
              className="h-8 w-full border-[#555] bg-transparent text-white/80 hover:bg-white/10"
            >
              Limpiar filtros
            </Button>
          </div>
        </section>

        <div className="space-y-3 pb-3">
          <DataSection
            title="Agente"
            labelHeader="Agente"
            rows={visibleAgentRows}
            quartiles={quartilesBySection.agentes}
            showSecondary
            showAF={showAF}
            showMC={showMC}
            collapsible={{
              collapsed: agentsCollapsed,
              totalRows: agentRows.length,
            }}
            onToggleCollapse={() => setAgentsCollapsed((prev) => !prev)}
          />

          <DataSection
            title="Origen"
            labelHeader="Origen"
            rows={origenRows}
            quartiles={quartilesBySection.origen}
            showSecondary={false}
            showAF={showAF}
            showMC={showMC}
          />

          <DataSection
            title="Semana"
            labelHeader="Semana"
            rows={semanaRows}
            quartiles={quartilesBySection.semana}
            showSecondary={false}
            showAF={showAF}
            showMC={showMC}
          />

          <DataSection
            title="Régimen"
            labelHeader="Régimen"
            rows={regimenRows}
            quartiles={quartilesBySection.regimen}
            showSecondary={false}
            showAF={showAF}
            showMC={showMC}
          />

          <DataSection
            title="Campus"
            labelHeader="Campus"
            rows={campusRows}
            quartiles={quartilesBySection.campus}
            showSecondary={false}
            showAF={showAF}
            showMC={showMC}
          />
        </div>
      </div>
    </div>
  );
}
