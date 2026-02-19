"use client";

import { Sparkles, BarChart3, Layers3, Gauge, Table as TableIcon } from "lucide-react";

import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { DraggableGrid } from "@/features/dashboard/components/draggable-grid";
import { TopKpis } from "@/features/dashboard/components/top-kpis";
import { FiltersBar } from "@/features/dashboard/components/filters-bar";
import { DataUploadDialog } from "@/features/dashboard/components/upload/data-upload-dialog";
import { useData } from "@/features/dashboard/hooks/useData";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WidgetCard } from "@/features/dashboard/components/widgets/widget-card";
import { TrendChart } from "@/features/dashboard/components/widgets/trend-chart";
import { FunnelChart } from "@/features/dashboard/components/widgets/funnel-chart";
import { GaugeChart } from "@/features/dashboard/components/widgets/gauge-chart";
import { useDashboardStore } from "@/store/dashboard-store";

const GaugeGroup = () => (
  <div className="h-full w-full grid grid-cols-2 gap-4 min-h-[200px]">
    <div className="rounded-xl bg-white/5 border border-white/5 relative flex items-center justify-center p-2">
      <GaugeChart title="Contactabilidad" value={65} />
    </div>
    <div className="rounded-xl bg-white/5 border border-white/5 relative flex items-center justify-center p-2">
      <GaugeChart title="Efectividad" value={42} />
    </div>
    <div className="rounded-xl bg-white/5 border border-white/5 relative flex items-center justify-center p-2">
      <GaugeChart title="Citas/AF" value={28} />
    </div>
    <div className="rounded-xl bg-white/5 border border-white/5 relative flex items-center justify-center p-2">
      <GaugeChart title="Citas/MC" value={85} />
    </div>
  </div>
);

const TableWidget = () => (
  <div className="h-full w-full flex items-center justify-center min-h-[300px]">
    <div className="text-center space-y-2">
      <TableIcon className="size-10 text-white/30 mx-auto" />
      <p className="text-sm text-white/50">Advanced Data Grid</p>
    </div>
  </div>
);


export function DashboardPage() {
  const { meta, hydrating } = useData();
  const { widgetOrder, setWidgetOrder, comparisonMode, setComparisonMode } = useDashboardStore();

  const renderWidget = (id: string) => {
    switch (id) {
      case "chart-main":
        return (
          <WidgetCard
            title="Tendencia de Ventas"
            icon={<BarChart3 size={18} />}
            className="h-full md:col-span-2 lg:col-span-3"
            headerAction={
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setComparisonMode('week')}
                  className={`text-[10px] px-2 py-1 rounded-md transition-all ${comparisonMode === 'week' ? 'bg-[var(--color-neon-cyan)] text-black font-bold' : 'text-white/60 hover:text-white'}`}
                >
                  SEMANA
                </button>
                <button
                  onClick={() => setComparisonMode('day')}
                  className={`text-[10px] px-2 py-1 rounded-md transition-all ${comparisonMode === 'day' ? 'bg-[var(--color-neon-cyan)] text-black font-bold' : 'text-white/60 hover:text-white'}`}
                >
                  DÍA
                </button>
              </div>
            }
          >
            <TrendChart />
          </WidgetCard>
        );
      case "funnel":
        return (
          <WidgetCard title="Conversion Funnel" icon={<Layers3 size={18} />} className="h-full">
            <FunnelChart />
          </WidgetCard>
        );
      case "gauge-group":
        return (
          <WidgetCard title="Performance KPIs" icon={<Gauge size={18} />} className="h-full">
            <GaugeGroup />
          </WidgetCard>
        );
      case "table":
        return (
          <WidgetCard title="Detalle Diario" icon={<TableIcon size={18} />} className="h-full md:col-span-2 lg:col-span-4">
            <TableWidget />
          </WidgetCard>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardShell>
      {/* Top Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-10 items-center justify-center rounded-2xl border border-[var(--color-neon-cyan)]/30 bg-[var(--color-neon-cyan)]/10 shadow-[0_0_20px_rgba(6,208,249,0.2)]">
            <Sparkles className="size-5 text-[var(--color-neon-cyan)] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-[family-name:var(--font-space-grotesk)]">
              Dashboard General
            </h1>
            <p className="text-xs text-white/50">
              Resumen ejecutivo en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="size-2 rounded-full bg-emerald-500 animate-[vivo-pulse_2s_infinite]" />
            <span className="text-xs font-medium text-emerald-400">VIVO</span>
          </div>
          {meta ? (
            <Badge variant="neutral" className="bg-white/5 border-white/10 hover:bg-white/10">
              {`Actualizado: ${new Date(meta.importedAtISO).toLocaleString("es-ES")}`}
            </Badge>
          ) : hydrating ? (
            <Badge variant="neutral">Cargando...</Badge>
          ) : (
            <Badge variant="neutral">Sin datos</Badge>
          )}
          <DataUploadDialog />
        </div>
      </div>

      {/* Controls & KPIs */}
      <div className="space-y-6 mb-8">
        <div className="p-1">
          <FiltersBar />
        </div>
        <TopKpis />
      </div>

      <Separator className="my-8 bg-white/10" />

      {/* View Logic */}
      {useDashboardStore(s => s.currentView) === 'overview' ? (
        <DraggableGrid
          items={widgetOrder.filter(id => !id.startsWith('kpi'))}
          onOrderChange={setWidgetOrder}
          renderItem={renderWidget}
          className="pb-20"
        />
      ) : (
        <div className="flex h-[400px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5">
          <p className="text-lg text-white/40">Vista {useDashboardStore(s => s.currentView)} en construcción</p>
          <p className="text-sm text-white/20">Pronto disponible con más métricas detalladas.</p>
        </div>
      )}
    </DashboardShell>
  );
}
