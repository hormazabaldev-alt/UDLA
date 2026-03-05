"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { ArrowLeft, Users, Filter, BarChart3 } from "lucide-react";

import { useData } from "@/features/dashboard/hooks/useData";
import {
  NO_ASIGNADO,
  aggByAgent,
  aggByCarrera,
  aggByCombo,
  aggByMarketing,
  applyAgentFilters,
  collectAgentFilterOptions,
  computeRowProductivity,
  type AgentFilters,
} from "@/lib/agent-analytics/agentMetrics";
import { formatInt } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

ModuleRegistry.registerModules([AllCommunityModule]);

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

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[#00d4ff] tabular-nums">{value}</div>
      {sub ? <div className="text-[11px] text-white/60 mt-1">{sub}</div> : null}
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#080808] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wider text-white/55 font-semibold">{label}</div>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-white/40 hover:text-white/70"
          >
            Limpiar ({selected.length})
          </button>
        ) : null}
      </div>
      <div className="mt-2 max-h-[124px] overflow-y-auto flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className="px-2 py-1 text-[11px] rounded border transition-colors"
              style={{
                backgroundColor: active ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.03)",
                borderColor: active ? "#00d4ff" : "rgba(255,255,255,0.08)",
                color: active ? "#00d4ff" : "rgba(255,255,255,0.65)",
              }}
            >
              {option || NO_ASIGNADO}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function GestionAgentesPage() {
  const { dataset, hydrating } = useData();
  const [filters, setFilters] = useState<AgentFilters>(EMPTY_FILTERS);
  const [comboMinTotal, setComboMinTotal] = useState(20);

  const rows = dataset?.rows ?? [];
  const options = useMemo(() => collectAgentFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => applyAgentFilters(rows, filters), [rows, filters]);
  const totals = useMemo(() => computeRowProductivity(filteredRows), [filteredRows]);

  const agentRows = useMemo(() => aggByAgent(filteredRows), [filteredRows]);
  const marketingRows = useMemo(() => aggByMarketing(filteredRows), [filteredRows]);
  const comboRows = useMemo(
    () => aggByCombo(filteredRows, { minTotal: comboMinTotal, limit: 10 }),
    [filteredRows, comboMinTotal],
  );
  const carreraRows = useMemo(() => aggByCarrera(filteredRows), [filteredRows]);

  const onToggle = (key: keyof Omit<AgentFilters, "dateFrom" | "dateTo">, value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const onClear = (key: keyof Omit<AgentFilters, "dateFrom" | "dateTo">) => {
    setFilters((prev) => ({ ...prev, [key]: [] }));
  };

  const resetAll = () => setFilters(EMPTY_FILTERS);

  const agentColDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Agente", field: "agente", minWidth: 180, flex: 1.2 },
      { headerName: "Total Gestiones", field: "totalGestiones", minWidth: 140 },
      { headerName: "Conecta", field: "conectaTotal", minWidth: 110 },
      { headerName: "% Conecta", field: "pctConecta", minWidth: 110, valueFormatter: (p) => formatPct(Number(p.value ?? 0)) },
      { headerName: "Interesa", field: "interesaTotal", minWidth: 110 },
      { headerName: "% Interesa", field: "pctInteresa", minWidth: 115, valueFormatter: (p) => formatPct(Number(p.value ?? 0)) },
      { headerName: "% Interesa/Conecta", field: "pctInteresaSobreConecta", minWidth: 150, valueFormatter: (p) => formatPct(Number(p.value ?? 0)) },
    ],
    [],
  );

  const marketingColDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Marketing 5", field: "marketing5", minWidth: 180, flex: 1.2 },
      { headerName: "Total", field: "totalGestiones", minWidth: 110 },
      { headerName: "Conecta", field: "conectaTotal", minWidth: 110 },
      { headerName: "Interesa", field: "interesaTotal", minWidth: 110 },
      { headerName: "% Interesa", field: "pctInteresa", minWidth: 115, valueFormatter: (p) => formatPct(Number(p.value ?? 0)) },
    ],
    [],
  );

  const comboColDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Marketing 5", field: "marketing5", minWidth: 170, flex: 1 },
      { headerName: "Carrera Interes", field: "carreraInteres", minWidth: 180, flex: 1.2 },
      { headerName: "CodigoBanner", field: "codigoBanner", minWidth: 150, flex: 1 },
      { headerName: "Total", field: "totalGestiones", minWidth: 90 },
      { headerName: "Interesa", field: "interesaTotal", minWidth: 100 },
      { headerName: "% Interesa", field: "pctInteresa", minWidth: 110, valueFormatter: (p) => formatPct(Number(p.value ?? 0)) },
    ],
    [],
  );

  const carreraColDefs = useMemo<ColDef[]>(
    () => [
      { headerName: "Carrera Interes", field: "carreraInteres", minWidth: 220, flex: 1.4 },
      { headerName: "Total", field: "totalGestiones", minWidth: 110 },
      { headerName: "Conecta", field: "conectaTotal", minWidth: 110 },
      { headerName: "Interesa", field: "interesaTotal", minWidth: 110 },
      { headerName: "% Interesa", field: "pctInteresa", minWidth: 115, valueFormatter: (p) => formatPct(Number(p.value ?? 0)) },
    ],
    [],
  );

  if (hydrating) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/60">Cargando datos...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold">Sin datos</h2>
          <p className="text-white/50 text-sm">Carga un Excel desde el dashboard principal.</p>
          <Link href="/" className="inline-flex items-center gap-1 text-[#00d4ff] text-sm hover:underline">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1680px] mx-auto px-5 py-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80">
              <ArrowLeft className="size-4" />
              Volver al dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              Gestión de <span className="text-[#00d4ff]">Agentes</span>
            </h1>
            <p className="text-sm text-white/50">
              Productividad por fila (sin deduplicación por RUT).
            </p>
          </div>
          <div className="text-xs text-white/50 text-right">
            Filas filtradas: <span className="text-white/80">{formatInt(filteredRows.length)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          <MetricCard label="Total Gestiones" value={formatInt(totals.totalGestiones)} />
          <MetricCard label="Conecta" value={formatInt(totals.conectaTotal)} sub="% con lógica Conecta/No Conecta" />
          <MetricCard label="Interesa" value={formatInt(totals.interesaTotal)} sub="isInteresaViene()" />
          <MetricCard label="% Conecta" value={formatPct(totals.pctConecta)} />
          <MetricCard label="% Interesa / Conecta" value={formatPct(totals.pctInteresaSobreConecta)} />
        </div>

        <section className="rounded-xl border border-[#1f1f1f] bg-[#060606] p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/85">
              <Filter className="size-4 text-[#00d4ff]" />
              Filtros
            </div>
            <Button variant="outline" size="sm" onClick={resetAll} className="border-[#333] text-white/70 hover:bg-[#161616]">
              Limpiar todo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            <div className="rounded-lg border border-[#1f1f1f] bg-[#080808] p-3">
              <div className="text-[11px] uppercase tracking-wider text-white/55 font-semibold mb-2">Rango de fechas</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="h-8"
                />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="h-8"
                />
              </div>
              <div className="text-[10px] text-white/45 mt-2">
                Usa `Fecha Gestion`; si es null, usa `Fecha Carga`.
              </div>
            </div>

            <MultiSelect label="Semana" options={options.semanas} selected={filters.semanas} onToggle={(v) => onToggle("semanas", v)} onClear={() => onClear("semanas")} />
            <MultiSelect label="Régimen" options={options.regimenes} selected={filters.regimenes} onToggle={(v) => onToggle("regimenes", v)} onClear={() => onClear("regimenes")} />
            <MultiSelect label="Sede Interes" options={options.sedesInteres} selected={filters.sedesInteres} onToggle={(v) => onToggle("sedesInteres", v)} onClear={() => onClear("sedesInteres")} />
            <MultiSelect label="AF" options={options.afValues} selected={filters.afValues} onToggle={(v) => onToggle("afValues", v)} onClear={() => onClear("afValues")} />
            <MultiSelect label="MC" options={options.mcValues} selected={filters.mcValues} onToggle={(v) => onToggle("mcValues", v)} onClear={() => onClear("mcValues")} />
            <MultiSelect label="AF Campus" options={options.afCampus} selected={filters.afCampus} onToggle={(v) => onToggle("afCampus", v)} onClear={() => onClear("afCampus")} />
            <MultiSelect label="MC Campus" options={options.mcCampus} selected={filters.mcCampus} onToggle={(v) => onToggle("mcCampus", v)} onClear={() => onClear("mcCampus")} />
            <MultiSelect label="Conecta" options={options.conecta} selected={filters.conecta} onToggle={(v) => onToggle("conecta", v)} onClear={() => onClear("conecta")} />
            <MultiSelect label="Agente" options={options.agentes} selected={filters.agentes} onToggle={(v) => onToggle("agentes", v)} onClear={() => onClear("agentes")} />
            <MultiSelect label="Marketing 5" options={options.marketing5} selected={filters.marketing5} onToggle={(v) => onToggle("marketing5", v)} onClear={() => onClear("marketing5")} />
            <MultiSelect label="CodigoBanner" options={options.codigoBanner} selected={filters.codigoBanner} onToggle={(v) => onToggle("codigoBanner", v)} onClear={() => onClear("codigoBanner")} />
            <MultiSelect label="Carrera Interes" options={options.carreraInteres} selected={filters.carreraInteres} onToggle={(v) => onToggle("carreraInteres", v)} onClear={() => onClear("carreraInteres")} />
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#060606] p-3">
            <div className="text-sm font-semibold text-white/85 mb-2 inline-flex items-center gap-2">
              <Users className="size-4 text-[#00d4ff]" />
              Ranking por Agente
            </div>
            <div className="ag-theme-quartz-dark">
              <AgGridReact
                rowData={agentRows}
                columnDefs={agentColDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                domLayout="autoHeight"
                animateRows
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#060606] p-3">
            <div className="text-sm font-semibold text-white/85 mb-2 inline-flex items-center gap-2">
              <BarChart3 className="size-4 text-[#00d4ff]" />
              Ranking por Marketing 5
            </div>
            <div className="text-[11px] text-white/45 mb-2">
              Click en una fila para aplicar filtro de Marketing 5.
            </div>
            <div className="ag-theme-quartz-dark">
              <AgGridReact
                rowData={marketingRows}
                columnDefs={marketingColDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                domLayout="autoHeight"
                animateRows
                onRowClicked={(e) => {
                  const marketing = String(e.data?.marketing5 ?? "");
                  if (!marketing) return;
                  setFilters((prev) => ({ ...prev, marketing5: [marketing] }));
                }}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-3 pb-4">
          <div className="rounded-xl border border-[#1f1f1f] bg-[#060606] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white/85">Top combinaciones (MKT + Carrera + Banner)</div>
              <div className="flex items-center gap-2 text-xs text-white/55">
                <span>Mínimo N</span>
                <Input
                  type="number"
                  min={1}
                  value={String(comboMinTotal)}
                  onChange={(e) => setComboMinTotal(Math.max(1, Number.parseInt(e.target.value || "1", 10)))}
                  className="h-7 w-20"
                />
              </div>
            </div>
            <div className="text-[11px] text-white/45 mb-2">
              Top 10 por % Interesa con mínimo {formatInt(comboMinTotal)} filas.
            </div>
            <div className="ag-theme-quartz-dark">
              <AgGridReact
                rowData={comboRows}
                columnDefs={comboColDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                domLayout="autoHeight"
                animateRows
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1f1f1f] bg-[#060606] p-3">
            <div className="text-sm font-semibold text-white/85 mb-2">Vista por Carrera Interes</div>
            <div className="ag-theme-quartz-dark">
              <AgGridReact
                rowData={carreraRows}
                columnDefs={carreraColDefs}
                defaultColDef={{ sortable: true, resizable: true, filter: true }}
                domLayout="autoHeight"
                animateRows
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
