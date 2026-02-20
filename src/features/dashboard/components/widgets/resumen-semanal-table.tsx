"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ArrowDownAZ, ArrowUpZA, ArrowUpDown, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import {
  calcResumenSemanal,
  runResumenSemanalSanityChecks,
} from "@/lib/metrics/resumen-semanal";
import type { ResumenSemanalRow } from "@/lib/metrics/resumen-semanal";
import { formatInt } from "@/lib/utils/format";

function formatPct(value: number, digits: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function ResumenSemanalTable() {
  const { rows } = useMetrics();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ResumenSemanalRow;
    direction: "asc" | "desc" | null;
  }>({ key: "semana", direction: "asc" }); // Default sort

  const [colFilters, setColFilters] = useState<Partial<Record<keyof ResumenSemanalRow, string[]>>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<keyof ResumenSemanalRow | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setActiveFilterCol(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resumen = useMemo(() => calcResumenSemanal(rows), [rows]);

  const uniqueValues = useMemo(() => {
    const vals: Partial<Record<keyof ResumenSemanalRow, string[]>> = {};
    const keys: Array<keyof ResumenSemanalRow> = ["semana", "citas", "recorrido", "afluencias", "matriculas", "pctRecorrido", "pctAfluencia", "pctMatriculas"];
    keys.forEach(k => {
      vals[k] = Array.from(new Set(resumen.rows.map(r => String(r[k])))).sort((a, b) => {
        const cleanA = parseFloat(a.replace(/\D/g, "")) || 0;
        const cleanB = parseFloat(b.replace(/\D/g, "")) || 0;
        return cleanA - cleanB;
      });
    });
    return vals;
  }, [resumen.rows]);

  const filteredRows = useMemo(() => {
    return resumen.rows.filter(r => {
      for (const key of Object.keys(colFilters)) {
        const k = key as keyof ResumenSemanalRow;
        const selectedVals = colFilters[k];
        if (selectedVals && selectedVals.length > 0) {
          if (!selectedVals.includes(String(r[k]))) {
            return false;
          }
        }
      }
      return true;
    });
  }, [resumen.rows, colFilters]);

  const sortedRows = useMemo(() => {
    let sortableItems = [...filteredRows];
    if (sortConfig.direction !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Custom sort for 'semana' which is a string like "Semana 12"
        if (sortConfig.key === "semana") {
          aValue = parseInt((aValue as string).replace(/\D/g, ""), 10) || 0;
          bValue = parseInt((bValue as string).replace(/\D/g, ""), 10) || 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRows, sortConfig]);

  const requestSort = (key: keyof ResumenSemanalRow) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: keyof ResumenSemanalRow) => {
    if (sortConfig.key !== columnKey || sortConfig.direction === null) {
      return <ArrowUpDown className="size-[10px] text-white/20 transition-colors group-hover:text-white/40" />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowDownAZ className="size-[10px] text-[#00d4ff]" />;
    }
    return <ArrowUpZA className="size-[10px] text-[#00d4ff]" />;
  };

  const toggleFilterVal = (colKey: keyof ResumenSemanalRow, val: string) => {
    setColFilters(prev => {
      const current = prev[colKey] || [];
      const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
      return { ...prev, [colKey]: next };
    });
  };

  const clearFilter = (colKey: keyof ResumenSemanalRow) => {
    setColFilters(prev => ({ ...prev, [colKey]: [] }));
  };

  const renderFilterPopover = (k: keyof ResumenSemanalRow, label: string) => {
    if (activeFilterCol !== k) return null;
    const options = uniqueValues[k] || [];
    const selected = colFilters[k] || [];

    return (
      <div ref={filterRef} className="absolute top-10 right-0 z-50 w-44 bg-[#111] border border-[#222] rounded-md shadow-2xl p-2 max-h-[220px] flex flex-col cursor-default">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#222]">
          <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Filtrar</span>
          <button onClick={(e) => { e.stopPropagation(); clearFilter(k); }} className="text-[9px] text-[#00d4ff] hover:text-[#00d4ff]/80">Limpiar</button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-1 pr-1 custom-scrollbar">
          {options.map(opt => {
            const isPct = k.toString().startsWith("pct");
            const optFloat = parseFloat(opt);
            const isNum = !isNaN(optFloat);
            const displayVal = k === "semana" ? opt : isPct ? formatPct(optFloat, 0) : isNum ? formatInt(optFloat) : opt;

            return (
              <label key={opt} className="flex items-center gap-2 text-xs text-white/80 hover:bg-white/5 p-1 rounded cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggleFilterVal(k, opt)}
                  className="rounded-[3px] border-[#333] bg-black text-[#00d4ff] focus:ring-[#00d4ff] focus:ring-1 focus:ring-offset-0"
                />
                <span className="truncate">{displayVal}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  const filteredTotals = useMemo(() => {
    const t = { citas: 0, recorrido: 0, afluencias: 0, matriculas: 0 };
    for (const r of filteredRows) {
      t.citas += r.citas;
      t.recorrido += r.recorrido;
      t.afluencias += r.afluencias;
      t.matriculas += r.matriculas;
    }
    return {
      ...t,
      pctRecorrido: t.citas > 0 ? t.recorrido / t.citas : 0,
      pctAfluencia: t.recorrido > 0 ? t.afluencias / t.recorrido : 0,
      pctMatriculas: t.afluencias > 0 ? t.matriculas / t.afluencias : 0,
    };
  }, [filteredRows]);

  const excludedTotal = resumen.excluded.invalidCitas + resumen.excluded.missingSemana;

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {excludedTotal > 0 ? (
        <div className="mb-2 text-[11px] text-white/50">
          Excluidos del resumen:{" "}
          <span className="text-white/80 tabular-nums">{formatInt(excludedTotal)}</span>{" "}
          · sin Semana:{" "}
          <span className="text-white/80 tabular-nums">
            {formatInt(resumen.excluded.missingSemana)}
          </span>{" "}
          · sin Fecha Carga:{" "}
          <span className="text-white/80 tabular-nums">
            {formatInt(resumen.excluded.invalidCitas)}
          </span>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto rounded-sm border border-[#1f1f1f] bg-[#070707]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[#0b0b0b]">
            <tr className="border-b border-[#1f1f1f]">
              {([
                { key: "semana", label: "SEMANA", align: "left" },
                { key: "citas", label: "CITAS", align: "right" },
                { key: "recorrido", label: "RECORRIDO", align: "right" },
                { key: "afluencias", label: "AFLUENCIAS", align: "right" },
                { key: "matriculas", label: "MATRÍCULAS", align: "right" },
                { key: "pctRecorrido", label: "% RECORRIDO", align: "right" },
                { key: "pctAfluencia", label: "% AFLUENCIA", align: "right" },
                { key: "pctMatriculas", label: "% MATRÍCULAS", align: "right" }
              ] as const).map(col => {
                const hasActives = (colFilters[col.key]?.length || 0) > 0;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "group relative px-2.5 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors",
                      col.align === "left" ? "text-left" : "text-right"
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5 cursor-pointer relative z-10", col.align === "left" ? "justify-start" : "justify-end")} onClick={() => requestSort(col.key)}>
                      {col.align === "right" && getSortIcon(col.key)}
                      <span>{col.label}</span>
                      {col.align === "left" && getSortIcon(col.key)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFilterCol(activeFilterCol === col.key ? null : col.key);
                      }}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-all z-20",
                        col.align === "left" ? "right-2" : "left-2",
                        hasActives ? "opacity-100 text-[#00d4ff]" : "opacity-0 group-hover:opacity-100 text-white/40"
                      )}
                    >
                      <Filter className="size-3" />
                      {hasActives && <span className="absolute -top-1 -right-1 size-2 bg-[#00d4ff] rounded-full" />}
                    </button>
                    {renderFilterPopover(col.key, col.label)}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.semana} className="border-b border-[#141414] hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-white/80 font-medium">{r.semana}</td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatInt(r.citas)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatInt(r.recorrido)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatInt(r.afluencias)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatInt(r.matriculas)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatPct(r.pctRecorrido, 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatPct(r.pctAfluencia, 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatPct(r.pctMatriculas, 0)}
                </td>
              </tr>
            ))}

            <tr className="bg-gradient-to-r from-orange-500/25 to-orange-500/10 border-t border-orange-500/30">
              <td className="px-3 py-2 font-bold text-white/90 uppercase tracking-wider">
                TOTALES
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatInt(filteredTotals.citas)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatInt(filteredTotals.recorrido)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatInt(filteredTotals.afluencias)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatInt(filteredTotals.matriculas)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatPct(filteredTotals.pctRecorrido, 1)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatPct(filteredTotals.pctAfluencia, 0)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatPct(filteredTotals.pctMatriculas, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
