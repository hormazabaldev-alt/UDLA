"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate } from "framer-motion";
import {
  Activity,
  CalendarRange,
  CheckCircle2,
  Gauge,
  Fingerprint,
  PhoneCall,
  Route,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/format";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function pctTone(value: number | null) {
  if (value === null) return "neutral" as const;
  const v = clamp01(value);
  if (v >= 0.65) return "success" as const;
  if (v >= 0.45) return "info" as const;
  if (v >= 0.3) return "neutral" as const;
  return "danger" as const;
}

function AnimatedNumber({
  value,
  format,
  duration = 0.7,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [duration, value]);

  return <span className="tabular-nums">{format(display)}</span>;
}

function KpiCard({
  title,
  value,
  format,
  icon: Icon,
  badge,
  tone = "neutral",
}: {
  title: string;
  value: number;
  format: (n: number) => string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: { label: string; variant: "neutral" | "success" | "danger" | "info" };
  tone?: "neutral" | "success" | "danger" | "info";
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        tone === "success"
          ? "border-emerald-400/15 bg-emerald-400/4"
          : null,
        tone === "danger" ? "border-red-400/15 bg-red-400/4" : null,
        tone === "info" ? "border-cyan-400/15 bg-cyan-400/4" : null,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_30%_0%,rgba(255,255,255,0.05),transparent_60%)]" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/60">{title}</span>
          <Icon className="size-4 text-white/45" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="text-2xl font-semibold tracking-tight">
            <AnimatedNumber value={value} format={format} />
          </div>
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function TopKpis() {
  const { totals } = useMetrics();

  const kpis = useMemo(() => {
    if (!totals) return null;
    return [
      {
        title: "Base Cargada",
        value: totals.cargada,
        format: (n: number) => formatInt(Math.round(n)),
        icon: Users,
      },
      {
        title: "Recorrido",
        value: totals.recorrido,
        format: (n: number) => formatInt(Math.round(n)),
        icon: Route,
      },
      {
        title: "Contactado",
        value: totals.contactado,
        format: (n: number) => formatInt(Math.round(n)),
        icon: PhoneCall,
      },
      {
        title: "% Contactabilidad",
        value: Math.round((totals.pctContactabilidad ?? 0) * 1000) / 10,
        format: (n: number) => `${n.toFixed(1)}%`,
        icon: Fingerprint,
        tone: pctTone(totals.pctContactabilidad),
      },
      {
        title: "Citas",
        value: totals.citas,
        format: (n: number) => formatInt(Math.round(n)),
        icon: CalendarRange,
      },
      {
        title: "AF",
        value: totals.af,
        format: (n: number) => formatInt(Math.round(n)),
        icon: CheckCircle2,
      },
      {
        title: "MC",
        value: totals.mc,
        format: (n: number) => formatInt(Math.round(n)),
        icon: Target,
      },
      {
        title: "% Efectividad",
        value: Math.round((totals.pctEfectividad ?? 0) * 1000) / 10,
        format: (n: number) => `${n.toFixed(1)}%`,
        icon: Activity,
        tone: pctTone(totals.pctEfectividad),
      },
      {
        title: "Tc% AF / Citas",
        value: Math.round((totals.tcAf ?? 0) * 1000) / 10,
        format: (n: number) => `${n.toFixed(1)}%`,
        icon: Gauge,
        tone: pctTone(totals.tcAf),
        badge: { label: "AF/Citas", variant: "info" },
      },
      {
        title: "Tc% MC / Citas",
        value: Math.round((totals.tcMc ?? 0) * 1000) / 10,
        format: (n: number) => `${n.toFixed(1)}%`,
        icon: Gauge,
        tone: pctTone(totals.tcMc),
        badge: { label: "MC/Citas", variant: "info" },
      },
    ] as const;
  }, [totals]);

  if (!kpis) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="text-sm text-white/60">
            Carga un Excel para habilitar KPIs y visualizaciones.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-10">
      {kpis.map((k) => (
        <div
          key={k.title}
          className={cn(
            "md:col-span-2 xl:col-span-2",
          )}
        >
          <KpiCard {...k} />
        </div>
      ))}
    </div>
  );
}
