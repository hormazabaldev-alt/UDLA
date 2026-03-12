"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
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
import {
  matchesTemporalFiltersForMetric,
  type TemporalFilters,
} from "@/lib/data-processing/temporal";
import { isAfluenciaValue, isMatriculaValue } from "@/lib/data-processing/predicates";
import { formatInt } from "@/lib/utils/format";
import { isInteresaViene } from "@/lib/utils/interesa";
import { toCampusCode } from "@/lib/utils/campus";
import { normalizeRut } from "@/lib/utils/rut";
import { Button } from "@/components/ui/button";

type FilterArrayKey = keyof Omit<AgentFilters, "meses">;

const EMPTY_FILTERS: AgentFilters = {
  meses: [],
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

function toTemporalFilters(filters: Pick<AgentFilters, "meses" | "semanas">): TemporalFilters {
  return {
    mes: filters.meses,
    diaNumero: [],
    semanas: filters.semanas,
  };
}

function countUniqueRuts(rows: DataRow[], predicate: (row: DataRow) => boolean) {
  const ruts = new Set<string>();
  for (const row of rows) {
    if (!predicate(row)) continue;
    const rut = normalizeRut(row.rutBase);
    if (rut) ruts.add(rut);
  }
  return ruts.size;
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

function rowMatchesAnyTemporalMetric(row: DataRow, temporalFilters: TemporalFilters) {
  return (
    matchesTemporalFiltersForMetric(row, temporalFilters, "recorrido")
    || matchesTemporalFiltersForMetric(row, temporalFilters, "citas")
    || matchesTemporalFiltersForMetric(row, temporalFilters, "af")
    || matchesTemporalFiltersForMetric(row, temporalFilters, "mc")
  );
}

function addRowToCounts(
  counts: SummaryCounts,
  row: MetricInputRow & DataRow,
  temporalFilters: TemporalFilters,
) {
  let contributed = false;

  if (matchesTemporalFiltersForMetric(row, temporalFilters, "recorrido")) {
    counts.recorrido += 1;
    if (isConecta(row.conecta)) counts.conecta += 1;
    if (isNoConecta(row.conecta)) counts.noConecta += 1;
    contributed = true;
  }

  if (isInteresaViene(row.interesa) && matchesTemporalFiltersForMetric(row, temporalFilters, "citas")) {
    counts.citas += 1;
    contributed = true;
  }

  if (isAfluenciaValue(row.af) && matchesTemporalFiltersForMetric(row, temporalFilters, "af")) {
    counts.af += 1;
    contributed = true;
  }

  if (isMatriculaValue(row.mc) && matchesTemporalFiltersForMetric(row, temporalFilters, "mc")) {
    counts.mc += 1;
    contributed = true;
  }

  return contributed;
}

function aggregateByLabel(
  rows: DataRow[],
  getLabel: (row: DataRow) => string,
  temporalFilters: TemporalFilters,
): PerformanceRow[] {
  const groups = new Map<string, SummaryCounts>();
  for (const row of rows) {
    if (!rowMatchesAnyTemporalMetric(row, temporalFilters)) continue;
    const label = getLabel(row);
    if (!groups.has(label)) groups.set(label, emptyCounts());
    addRowToCounts(groups.get(label)!, row, temporalFilters);
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
  temporalFilters: TemporalFilters,
): PerformanceRow[] {
  const groups = new Map<
    string,
    {
      counts: SummaryCounts;
      marketingCounts: Map<string, number>;
    }
  >();

  for (const row of rows) {
    if (!rowMatchesAnyTemporalMetric(row, temporalFilters)) continue;
    const agent = normalizeLabel(row.agente);
    const marketing = normalizeLabel(row.marketing5);

    if (!groups.has(agent)) {
      groups.set(agent, {
        counts: emptyCounts(),
        marketingCounts: new Map<string, number>(),
      });
    }

    const current = groups.get(agent)!;
    addRowToCounts(current.counts, row, temporalFilters);
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

function MetricCard({
  title,
  value,
  subtitle,
  accentLabel,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accentLabel?: string;
}) {
  return (
    <div className="rounded-md border border-[#1f1f1f] bg-[#050505] p-3 text-white">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/55">{title}</div>
      <div className="mt-1 text-[30px] font-bold leading-none text-[#00d4ff] tabular-nums">{value}</div>
      {accentLabel ? <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#00d4ff]/80">{accentLabel}</div> : null}
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

function campaignMonthLabel(month: number) {
  return `Mes ${month}`;
}

function MonthFilterGroup({
  selected,
  options,
  onToggle,
  onClear,
}: {
  selected: number[];
  options: number[];
  onToggle: (month: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-md border border-[#2a2a2a] bg-[#050505] p-3 text-white">
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-white/60">Mes</div>
      <div className="flex flex-wrap gap-1.5">
        {options.length === 0 ? (
          <span className="text-[11px] text-white/35 italic">Sin datos</span>
        ) : (
          options.map((month) => {
            const active = selected.includes(month);
            return (
              <button
                key={month}
                type="button"
                onClick={() => onToggle(month)}
                className="rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-white/5 hover:text-white"
                style={{
                  backgroundColor: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.04)",
                  borderColor: active ? "#00d4ff" : "rgba(255,255,255,0.08)",
                  color: active ? "#00d4ff" : "rgba(255,255,255,0.65)",
                }}
              >
                {campaignMonthLabel(month)}
              </button>
            );
          })
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-white/45">
        <span>Recorrido y citas usan Fecha Gestión; AF y MC usan sus fechas propias.</span>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-white/55 transition hover:text-white/80"
          >
            Limpiar ({selected.length})
          </button>
        ) : null}
      </div>
    </div>
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
  const dataColSpan =
    1
    + (showSecondary ? 1 : 0)
    + 4
    + (showAF ? 1 : 0)
    + (showMC ? 1 : 0);
  const quartileColSpan =
    2
    + (showAF ? 1 : 0)
    + (showAF && showMC ? 1 : 0)
    + (showMC ? 1 : 0);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold uppercase tracking-wide text-white/85">{title}</h2>
        {collapsible && onToggleCollapse && collapsible.totalRows > rows.length ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleCollapse}
            className="h-7 border-[#333] bg-transparent text-white/70 hover:bg-[#161616]"
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

      <div className="overflow-auto rounded-lg border border-[#1f1f1f] bg-[#080808]">
        <table className="w-full min-w-[1120px] border-collapse text-[12px] text-white/80">
          <thead>
            <tr>
              <th
                colSpan={dataColSpan}
                className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[#00d4ff]"
              >
                Datos finales
              </th>
              <th
                colSpan={quartileColSpan}
                className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[#00d4ff]"
              >
                Cuartiles
              </th>
            </tr>
            <tr>
              <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[#00d4ff]">{labelHeader}</th>
              {showSecondary ? (
                <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-left text-[10px] uppercase tracking-wider text-[#00d4ff]">Marketing 5</th>
              ) : null}
              <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">Recorrido</th>
              <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">Conecta</th>
              <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">No conecta</th>
              <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">Citas</th>
              {showAF ? <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">AF</th> : null}
              {showMC ? <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">MC</th> : null}
              <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">TC% Cont/Reco.</th>
              <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">TC% Cit/Cont</th>
              {showAF ? <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">TC% AF/Cit</th> : null}
              {showAF && showMC ? <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">TC% MC/AF</th> : null}
              {showMC ? <th className="border border-[#1f1f1f] bg-[#0c1118] px-2 py-1 text-center text-[10px] uppercase tracking-wider text-[#00d4ff]">TC% MC/Reco.</th> : null}
            </tr>
          </thead>
          <tbody>
            {hasRows ? (
              rows.map((row) => (
                <tr key={`${title}:${row.label}:${row.secondary}`}>
                  <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-white/85 whitespace-nowrap">{row.label}</td>
                  {showSecondary ? (
                    <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-white/70 whitespace-nowrap">{row.secondary}</td>
                  ) : null}
                  <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-right tabular-nums text-white/90 whitespace-nowrap">{formatInt(row.recorrido)}</td>
                  <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-right tabular-nums text-white/90 whitespace-nowrap">{formatInt(row.conecta)}</td>
                  <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-right tabular-nums text-white/90 whitespace-nowrap">{formatInt(row.noConecta)}</td>
                  <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-right tabular-nums text-white/90 whitespace-nowrap">{formatInt(row.citas)}</td>
                  {showAF ? (
                    <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-right tabular-nums text-white/90 whitespace-nowrap">{formatInt(row.af)}</td>
                  ) : null}
                  {showMC ? (
                    <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-right tabular-nums text-white/90 whitespace-nowrap">{formatInt(row.mc)}</td>
                  ) : null}
                  <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-center whitespace-nowrap">
                    <SemaforoBadge value={row.tcContReco} band={quartiles.tcContReco} />
                  </td>
                  <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-center whitespace-nowrap">
                    <SemaforoBadge value={row.tcCitCont} band={quartiles.tcCitCont} />
                  </td>
                  {showAF ? (
                    <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-center whitespace-nowrap">
                      <SemaforoBadge value={row.tcAfCit} band={quartiles.tcAfCit} />
                    </td>
                  ) : null}
                  {showAF && showMC ? (
                    <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-center whitespace-nowrap">
                      <SemaforoBadge value={row.tcMcAf} band={quartiles.tcMcAf} />
                    </td>
                  ) : null}
                  {showMC ? (
                    <td className="border border-[#1f1f1f] bg-[#080808] px-2 py-1 text-center whitespace-nowrap">
                      <SemaforoBadge value={row.tcMcReco} band={quartiles.tcMcReco} />
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={dataColSpan + quartileColSpan}
                  className="border border-[#1f1f1f] bg-[#080808] px-3 py-2 text-center text-white/45"
                >
                  Sin datos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
  const deferredFilters = useDeferredValue(filters);
  const temporalFilters = useMemo(() => toTemporalFilters(deferredFilters), [deferredFilters]);
  const options = useMemo(() => collectAgentFilterOptions(rows), [rows]);
  const baseRows = useMemo(
    () => applyAgentFilters(rows, deferredFilters, { includeTemporal: false }),
    [rows, deferredFilters],
  );
  const filteredRows = useMemo(
    () => baseRows.filter((row) => rowMatchesAnyTemporalMetric(row, temporalFilters)),
    [baseRows, temporalFilters],
  );

  const totals = useMemo(() => {
    const counts = emptyCounts();
    for (const row of baseRows) {
      addRowToCounts(counts, row, temporalFilters);
    }
    return {
      ...counts,
      pctConecta: safeDiv(counts.conecta, counts.recorrido),
      pctInteresaSobreConecta: safeDiv(counts.citas, counts.conecta),
    };
  }, [baseRows, temporalFilters]);

  const uniqueTotals = useMemo(
    () => ({
      recorrido: countUniqueRuts(
        baseRows,
        (row) => matchesTemporalFiltersForMetric(row, temporalFilters, "recorrido"),
      ),
      conecta: countUniqueRuts(
        baseRows,
        (row) => isConecta(row.conecta) && matchesTemporalFiltersForMetric(row, temporalFilters, "contactado"),
      ),
      citas: countUniqueRuts(
        baseRows,
        (row) => isInteresaViene(row.interesa) && matchesTemporalFiltersForMetric(row, temporalFilters, "citas"),
      ),
    }),
    [baseRows, temporalFilters],
  );

  const agentRows = useMemo(() => aggregateByAgent(baseRows, temporalFilters), [baseRows, temporalFilters]);
  const origenRows = useMemo(
    () => aggregateByLabel(baseRows, (row) => normalizeLabel(row.tipoBase), temporalFilters),
    [baseRows, temporalFilters],
  );
  const semanaRows = useMemo(
    () => aggregateByLabel(baseRows, (row) => normalizeLabel(row.semana), temporalFilters),
    [baseRows, temporalFilters],
  );
  const regimenRows = useMemo(
    () => aggregateByLabel(baseRows, (row) => normalizeLabel(row.regimen), temporalFilters),
    [baseRows, temporalFilters],
  );
  const campusRows = useMemo(
    () => aggregateByLabel(baseRows, (row) => normalizeCampus(row.sedeInteres), temporalFilters),
    [baseRows, temporalFilters],
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

  const toggleMonthFilter = (month: number) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        meses: prev.meses.includes(month)
          ? prev.meses.filter((value) => value !== month)
          : [...prev.meses, month],
      }));
    });
  };

  const setSingleFilter = (key: FilterArrayKey, value: string) => {
    startTransition(() => {
      setFilters((prev) => ({
        ...prev,
        [key]: value === "__ALL__" ? [] : [value],
      }));
    });
  };

  const selected = {
    agentes: filters.agentes[0] ?? "__ALL__",
    marketing5: filters.marketing5[0] ?? "__ALL__",
    carreraInteres: filters.carreraInteres[0] ?? "__ALL__",
    semanas: filters.semanas[0] ?? "__ALL__",
    regimenes: filters.regimenes[0] ?? "__ALL__",
  };

  const resetAll = () => {
    startTransition(() => {
      setFilters(EMPTY_FILTERS);
      setAgentsCollapsed(true);
    });
  };

  if (hydrating) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-sm text-white/60">Cargando datos...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-bold">Sin datos disponibles</h1>
          <p className="text-sm text-white/50">Carga un archivo Excel desde el dashboard principal.</p>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#00d4ff] hover:underline">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1800px] space-y-4 px-3 py-4 lg:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80">
              <ArrowLeft className="size-4" /> Volver al dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              Gestión de <span className="text-[#00d4ff]">Agentes</span>
            </h1>
          </div>
          <div className="text-right text-xs text-white/50">
            Filas filtradas: <span className="font-semibold text-white/85">{formatInt(filteredRows.length)}</span>
          </div>
        </div>

        <section className="grid gap-2 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
          <MonthFilterGroup
            options={options.meses}
            selected={filters.meses}
            onToggle={toggleMonthFilter}
            onClear={() => startTransition(() => setFilters((prev) => ({ ...prev, meses: [] })))}
          />

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              title="Total gestiones"
              value={formatInt(uniqueTotals.recorrido)}
              accentLabel="RUT unico"
              subtitle={`Gestion: ${formatInt(totals.recorrido)}`}
            />
            <MetricCard
              title="Conecta"
              value={formatInt(uniqueTotals.conecta)}
              accentLabel="RUT unico"
              subtitle={`Gestion: ${formatInt(totals.conecta)}`}
            />
            <MetricCard
              title="Interesa"
              value={formatInt(uniqueTotals.citas)}
              accentLabel="RUT unico"
              subtitle={`Gestion: ${formatInt(totals.citas)}`}
            />
            <MetricCard title="% Conecta" value={formatPctCard(totals.pctConecta)} />
            <MetricCard title="% Interesa / Conecta" value={formatPctCard(totals.pctInteresaSobreConecta)} />
          </div>

          <div className="rounded-md border border-[#2a2a2a] bg-[#050505] p-3 text-white">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">Campos variables</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-white/70">Agregar</span>
              <button
                type="button"
                onClick={() => startTransition(() => setShowAF((prev) => !prev))}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  showAF ? "border border-[#00d4ff] bg-[#00d4ff]/20 text-[#00d4ff]" : "border border-white/10 bg-white/5 text-white/70"
                }`}
              >
                AF
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => setShowMC((prev) => !prev))}
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  showMC ? "border border-[#00d4ff] bg-[#00d4ff]/20 text-[#00d4ff]" : "border border-white/10 bg-white/5 text-white/70"
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
            onToggleCollapse={() => startTransition(() => setAgentsCollapsed((prev) => !prev))}
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
