"use client";

import { useMemo } from "react";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import {
  calcResumenSemanal,
  runResumenSemanalSanityChecks,
} from "@/lib/metrics/resumen-semanal";
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

  const resumen = useMemo(() => calcResumenSemanal(rows), [rows]);

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
              <th className="text-left px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                SEMANA
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                CITAS
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                RECORRIDO
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                USABLES
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                AFLUENCIAS
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                MATRÍCULAS
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                % RECORRIDO
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                % USABLES
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                % AFLUENCIA
              </th>
              <th className="text-right px-3 py-2 font-bold text-white/70 tracking-wider uppercase">
                % MATRÍCULAS
              </th>
            </tr>
          </thead>

          <tbody>
            {resumen.rows.map((r) => (
              <tr key={r.semana} className="border-b border-[#141414] hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-white/80 font-medium">{r.semana}</td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatInt(r.citas)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatInt(r.recorrido)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/70">
                  {formatInt(r.usables)}
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
                  {formatPct(r.pctUsables, 0)}
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
                {formatInt(resumen.totals.usables)}
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
                {formatPct(resumen.totals.pctUsables, 0)}
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
