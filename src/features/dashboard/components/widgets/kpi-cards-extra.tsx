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

function Card({
  label,
  value,
  icon: Icon,
  hint,
  tooltip,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
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
        {hint ? (
          <div className="text-[10px] text-white/40 mt-1">{hint}</div>
        ) : null}
      </div>
      <Icon className="size-4 text-[#00d4ff]/70 flex-shrink-0 mt-0.5" />
    </div>
  );
}

export function KpiCardsExtra() {
  const { rows, totals } = useMetrics();

  const resumen = useMemo(() => calcResumenSemanal(rows), [rows]);

  const excludedTotal = resumen.excluded.invalidCitas + resumen.excluded.missingSemana;
  const hint =
    excludedTotal > 0
      ? `Excluidos: ${formatInt(excludedTotal)} (sin Semana: ${formatInt(
        resumen.excluded.missingSemana,
      )}, sin Fecha Carga: ${formatInt(resumen.excluded.invalidCitas)})`
      : undefined;

  if (!totals) return null;

  const cards = [
    { label: "Citas", value: formatInt(totals.citas), icon: CalendarCheck2, tooltip: "Citas (Interesa = Viene) contadas por RUT único." },
    { label: "Recorrido", value: formatInt(totals.recorrido), icon: Route, tooltip: "Recorrido (Conecta o No Conecta)." },
    { label: "Afluencias", value: formatInt(totals.af), icon: PhoneCall, tooltip: "Afluencias (AF = A, MC o M)." },
    { label: "Matrículas", value: formatInt(totals.mc), icon: GraduationCap, tooltip: "Matrículas (MC = M o MC)." },
    { label: "% Recorrido", value: formatPct(totals.tcLlaLeads, 1), icon: Percent, tooltip: "Recorrido / Base Cargada." },
    { label: "% Afluencia", value: formatPct(totals.tcAfCitas, 0), icon: Percent, tooltip: "Afluencias / Citas." },
    { label: "% Matrículas", value: formatPct(totals.tcMcAf, 0), icon: Percent, tooltip: "Matrículas / Afluencias." },
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
