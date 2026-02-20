"use client";

import { useMemo } from "react";
import {
  CalendarCheck2,
  Route,
  PhoneCall,
  UserCheck,
  GraduationCap,
  Percent,
} from "lucide-react";

import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import { calcResumenSemanal } from "@/lib/metrics/resumen-semanal";
import { formatInt } from "@/lib/utils/format";

function formatPct(value: number, digits: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function Card({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="bg-[#080808] border border-[#1f1f1f] rounded-sm p-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] text-white/55 uppercase tracking-wider font-semibold">
          {label}
        </div>
        <div className="text-2xl font-bold tracking-tight text-white mt-0.5 tabular-nums">
          {value}
        </div>
        {hint ? (
          <div className="text-[10px] text-white/35 mt-0.5">{hint}</div>
        ) : null}
      </div>
      <Icon className="size-4 text-[#00d4ff]/70 flex-shrink-0 mt-0.5" />
    </div>
  );
}

export function KpiCardsExtra() {
  const { rows } = useMetrics();

  const resumen = useMemo(() => calcResumenSemanal(rows), [rows]);
  const t = resumen.totals;

  const excludedTotal = resumen.excluded.invalidCitas + resumen.excluded.missingSemana;
  const hint =
    excludedTotal > 0
      ? `Excluidos: ${formatInt(excludedTotal)} (sin Semana: ${formatInt(
          resumen.excluded.missingSemana,
        )}, sin Fecha Carga: ${formatInt(resumen.excluded.invalidCitas)})`
      : undefined;

  const cards = [
    { label: "Citas", value: formatInt(t.citas), icon: CalendarCheck2 },
    { label: "Recorrido", value: formatInt(t.recorrido), icon: Route },
    { label: "Usables", value: formatInt(t.usables), icon: UserCheck },
    { label: "Afluencias", value: formatInt(t.afluencias), icon: PhoneCall },
    { label: "Matrículas", value: formatInt(t.matriculas), icon: GraduationCap },
    { label: "% Recorrido", value: formatPct(t.pctRecorrido, 1), icon: Percent },
    { label: "% Usables", value: formatPct(t.pctUsables, 0), icon: Percent },
    { label: "% Afluencia", value: formatPct(t.pctAfluencia, 0), icon: Percent },
    { label: "% Matrículas", value: formatPct(t.pctMatriculas, 0), icon: Percent },
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

