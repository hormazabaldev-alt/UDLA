"use client";

import { useMemo } from "react";
import {
  CalendarCheck2,
  Route,
  PhoneCall,
  GraduationCap,
  Percent,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { calcResumenSemanal } from "@/lib/metrics/resumen-semanal";
import { formatInt } from "@/lib/utils/format";

function formatPct(value01: number | null | undefined, digits: number) {
  const v = Number(value01 ?? 0);
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(v);
}

function formatPctFromCounts(numerator: number, denominator: number, digits: number) {
  return formatPct(denominator > 0 ? numerator / denominator : 0, digits);
}

function Card({
  label,
  value,
  icon: Icon,
  hint,
  subValue,
  accentLabel,
  tooltip,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  subValue?: string;
  accentLabel?: string;
  tooltip?: string;
}) {
  return (
    <div className="bg-[#080808] border border-[#1f1f1f] rounded-lg p-3 flex items-start justify-between gap-3 relative">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="text-[11px] text-white/80 uppercase tracking-wider font-bold">
            {label}
          </div>
          {tooltip && (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 text-white/40 cursor-help hover:text-white/80 transition-colors" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[200px] text-center">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="text-2xl font-bold tracking-tight text-white mt-1 tabular-nums">
          {value}
        </div>
        {accentLabel ? (
          <div className="text-[10px] text-[#00d4ff]/80 mt-1 font-bold uppercase tracking-[0.18em]">
            {accentLabel}
          </div>
        ) : null}
        {subValue ? (
          <div className="text-[10px] text-white/80 mt-1 font-semibold tracking-wide">
            {subValue}
          </div>
        ) : null}
        {hint ? (
          <div className="text-[10px] text-white/45 mt-1">{hint}</div>
        ) : null}
      </div>
      <Icon className="size-4 text-[#00d4ff]/70 flex-shrink-0 mt-0.5" />
    </div>
  );
}

export function KpiCardsExtra() {
  const { rows, totals, filters } = useMetrics();

  const resumen = useMemo(
    () => calcResumenSemanal(rows, { temporalFilters: filters ?? undefined }),
    [filters, rows],
  );

  const excludedTotal = resumen.excluded.invalidRows + resumen.excluded.missingSemana;
  const hint =
    excludedTotal > 0
      ? `Excluidos: ${formatInt(excludedTotal)} (sin Semana: ${formatInt(
        resumen.excluded.missingSemana,
      )}, sin RUT válido: ${formatInt(resumen.excluded.invalidRows)})`
      : undefined;

  if (!totals) return null;

  const cards = [
    {
      label: "Citas",
      value: formatInt(totals.citasRutUnico),
      subValue: `Gestion: ${formatInt(totals.citas)}`,
      accentLabel: "RUT unico",
      icon: CalendarCheck2,
      tooltip: "Citas (Interesa = Viene). Se muestra primero RUT único y abajo el total de gestión.",
    },
    {
      label: "Recorrido",
      value: formatInt(totals.recorridoRutUnico),
      subValue: `Gestion: ${formatInt(totals.recorrido)}`,
      accentLabel: "RUT unico",
      icon: Route,
      tooltip: "Recorrido (Conecta o No Conecta). Se muestra primero RUT único y abajo el total de gestión.",
    },
    {
      label: "Afluencias",
      value: formatInt(totals.afRutUnico),
      subValue: `Gestion: ${formatInt(totals.af)}`,
      accentLabel: "RUT unico",
      icon: PhoneCall,
      tooltip: "Afluencias (AF = A, M o MC). Se muestra primero RUT único y abajo el total de gestión.",
    },
    {
      label: "Matrículas",
      value: formatInt(totals.mcRutUnico),
      subValue: `Gestion: ${formatInt(totals.mc)}`,
      accentLabel: "RUT unico",
      icon: GraduationCap,
      tooltip: "Matrículas (MC = M o MC). Se muestra primero RUT único y abajo el total de gestión.",
    },
    {
      label: "% Recorrido",
      value: formatPctFromCounts(totals.recorridoRutUnico, totals.cargadaRutUnico, 1),
      subValue: `RUT: ${formatInt(totals.recorridoRutUnico)} / ${formatInt(totals.cargadaRutUnico)}`,
      icon: Percent,
      tooltip: "Recorrido / Base Cargados usando RUT únicos.",
    },
    {
      label: "% Afluencia",
      value: formatPctFromCounts(totals.afRutUnico, totals.citasRutUnico, 0),
      subValue: `RUT: ${formatInt(totals.afRutUnico)} / ${formatInt(totals.citasRutUnico)}`,
      icon: Percent,
      tooltip: "Afluencias / Citas usando RUT únicos.",
    },
    {
      label: "% Matrículas",
      value: formatPctFromCounts(totals.mcRutUnico, totals.afRutUnico, 0),
      subValue: `RUT: ${formatInt(totals.mcRutUnico)} / ${formatInt(totals.afRutUnico)}`,
      icon: Percent,
      tooltip: "Matrículas / Afluencias usando RUT únicos.",
    },
  ] as const;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">
          KPIs Nuevos
        </div>
        {hint ? <div className="text-[10px] text-white/35">{hint}</div> : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {cards.map((c) => (
          <Card key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
}
