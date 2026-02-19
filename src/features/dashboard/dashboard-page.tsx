"use client";

import { BarChart3, Gauge, Layers3, Sparkles } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DataUploadDialog } from "@/features/dashboard/components/upload/data-upload-dialog";
import { FiltersBar } from "@/features/dashboard/components/filters-bar";
import { TopKpis } from "@/features/dashboard/components/top-kpis";
import { useData } from "@/features/dashboard/hooks/useData";

export function DashboardPage() {
  const { meta, hydrating } = useData();

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="inline-flex size-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Sparkles className="size-4 text-cyan-200/90" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">
                Altius Analytics
              </div>
              <div className="text-xs text-white/55">
                Snapshot diario · sin login · interacción tipo Power BI
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {meta ? (
            <Badge variant="neutral">
              {`Última carga: ${new Date(meta.importedAtISO).toLocaleString("es-ES")}`}
            </Badge>
          ) : hydrating ? (
            <Badge variant="neutral">Cargando estado…</Badge>
          ) : (
            <Badge variant="neutral">Sin datos</Badge>
          )}
          <DataUploadDialog />
        </div>
      </div>

      <Separator className="my-5" />

      <div className="space-y-3">
        <FiltersBar />
        <TopKpis />

        <div className="grid gap-3 lg:grid-cols-[420px_1fr]">
          <Card className="lg:row-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm">Funnel</span>
                <Layers3 className="size-4 text-white/45" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="text-xs text-white/55">
                Próximo: embudo real (base→recorrido→contactado→citas→AF→MC) con animación progresiva.
              </div>
              <div className="mt-4 h-[340px] rounded-2xl border border-white/10 bg-white/3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm">Resultado mensual</span>
                <BarChart3 className="size-4 text-white/45" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="text-xs text-white/55">
                Próximo: barras comparativas Stock vs Web + línea de % Contactabilidad + tooltip multi-métrica.
              </div>
              <div className="mt-4 h-[340px] rounded-2xl border border-white/10 bg-white/3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm">Gauges</span>
                <Gauge className="size-4 text-white/45" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="text-xs text-white/55">
                Próximo: medidores premium (% Contactabilidad, % Efectividad, Tc% AF, Tc% MC).
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="h-[160px] rounded-2xl border border-white/10 bg-white/3" />
                <div className="h-[160px] rounded-2xl border border-white/10 bg-white/3" />
                <div className="h-[160px] rounded-2xl border border-white/10 bg-white/3" />
                <div className="h-[160px] rounded-2xl border border-white/10 bg-white/3" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-sm">Tabla avanzada</span>
              <span className="text-xs text-white/45">
                AG Grid · virtual scroll · sticky headers
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="text-xs text-white/55">
              Próximo: búsqueda, ordenamiento, highlight dinámico, y rendimiento enterprise.
            </div>
            <div className="mt-4 h-[420px] rounded-2xl border border-white/10 bg-white/3" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

