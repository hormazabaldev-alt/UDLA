"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpZA, ArrowUpDown } from "lucide-react";

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

  const resumen = useMemo(() => calcResumenSemanal(rows), [rows]);

  const sortedRows = useMemo(() => {
    let sortableItems = [...resumen.rows];
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
  }, [resumen.rows, sortConfig]);

  const requestSort = (key: keyof ResumenSemanalRow) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null; // Turn off sort, falling back to original order or triggering another re-sort if we wanted
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: keyof ResumenSemanalRow) => {
    if (sortConfig.key !== columnKey || sortConfig.direction === null) {
      return <ArrowUpDown className="size-3 text-white/20 transition-colors group-hover:text-white/40" />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowDownAZ className="size-3 text-[#00d4ff]" />;
    }
    return <ArrowUpZA className="size-3 text-[#00d4ff]" />;
  };

  if (process.env.NODE_ENV !== "production") {
    const check = runResumenSemanalSanityChecks(resumen);
    console.assert(check.ok, check.message);
  }

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
              <th
                onClick={() => requestSort("semana")}
                className="group cursor-pointer text-left px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  SEMANA {getSortIcon("semana")}
                </div>
              </th>
              <th
                onClick={() => requestSort("citas")}
                className="group cursor-pointer text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {getSortIcon("citas")} CITAS
                </div>
              </th>
              <th
                onClick={() => requestSort("recorrido")}
                className="group cursor-pointer text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {getSortIcon("recorrido")} RECORRIDO
                </div>
              </th>
              <th
                onClick={() => requestSort("afluencias")}
                className="group cursor-pointer text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {getSortIcon("afluencias")} AFLUENCIAS
                </div>
              </th>
              <th
                onClick={() => requestSort("matriculas")}
                className="group cursor-pointer text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {getSortIcon("matriculas")} MATRÍCULAS
                </div>
              </th>
              <th
                onClick={() => requestSort("pctRecorrido")}
                className="group cursor-pointer text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {getSortIcon("pctRecorrido")} % RECORRIDO
                </div>
              </th>
              <th
                onClick={() => requestSort("pctAfluencia")}
                className="group cursor-pointer text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {getSortIcon("pctAfluencia")} % AFLUENCIA
                </div>
              </th>
              <th
                onClick={() => requestSort("pctMatriculas")}
                className="group cursor-pointer text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {getSortIcon("pctMatriculas")} % MATRÍCULAS
                </div>
              </th>
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
                {formatInt(resumen.totals.citas)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatInt(resumen.totals.recorrido)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatInt(resumen.totals.afluencias)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatInt(resumen.totals.matriculas)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatPct(resumen.totals.pctRecorrido, 1)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatPct(resumen.totals.pctAfluencia, 0)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-white/90">
                {formatPct(resumen.totals.pctMatriculas, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
