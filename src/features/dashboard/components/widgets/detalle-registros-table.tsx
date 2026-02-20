"use client";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

import { Input } from "@/components/ui/input";
import { useMetrics } from "@/features/dashboard/hooks/useMetrics";
import type { DataRow } from "@/lib/data-processing/types";
import { formatInt } from "@/lib/utils/format";

ModuleRegistry.registerModules([AllCommunityModule]);

function formatDate(value: unknown) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("es-CL");
}

function toGridRow(r: DataRow): Record<string, unknown> {
  return {
    "Tipo Llamada": r.tipoLlamada ?? "",
    "Fecha Carga": r.fechaCarga,
    "Rut Base": r.rutBase ?? "",
    "Tipo Base": r.tipoBase ?? "",
    "Fecha Gestion": r.fechaGestion,
    Conecta: r.conecta ?? "",
    Interesa: r.interesa ?? "",
    Regimen: r.regimen ?? "",
    "Sede Interes": r.sedeInteres ?? "",
    Semana: r.semana ?? "",
    AF: r.af ?? "",
    "Fecha af": r.fechaAf,
    MC: r.mc ?? "",
    "Fecha MC": r.fechaMc,
  };
}

export function DetalleRegistrosTable({ height = 520 }: { height?: number }) {
  const { rows } = useMetrics();
  const [search, setSearch] = useState("");

  const gridRows = useMemo(() => rows.map(toGridRow), [rows]);

  const columnDefs = useMemo<ColDef[]>(() => {
    const first = gridRows[0];
    if (!first) return [];

    const keys = Object.keys(first);
    return keys.map((key) => {
      const isDate =
        key === "Fecha Carga" ||
        key === "Fecha Gestion" ||
        key === "Fecha af" ||
        key === "Fecha MC";

      return {
        headerName: key,
        field: key,
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
        minWidth: key === "Rut Base" ? 160 : 130,
        valueFormatter: isDate ? (p) => formatDate(p.value) : undefined,
      } satisfies ColDef;
    });
  }, [gridRows]);

  return (
    <div className="h-full w-full flex flex-col min-h-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-white/50">
          Filas (con filtros globales aplicados):{" "}
          <span className="text-white/80 tabular-nums">{formatInt(rows.length)}</span>
        </div>
        <div className="w-full sm:w-[360px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en tabla…"
            className="h-8 bg-[#0b0b0b] border-[#1f1f1f] text-white/85 placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="ag-theme-quartz-dark w-full overflow-hidden rounded-sm border border-[#1f1f1f] bg-[#070707]">
        <div style={{ height }}>
          <AgGridReact
            rowData={gridRows}
            columnDefs={columnDefs}
            defaultColDef={{
              sortable: true,
              filter: true,
              resizable: true,
            }}
            quickFilterText={search}
            animateRows
            rowHeight={40}
            headerHeight={44}
            suppressCellFocus
            pagination
            paginationPageSize={50}
          />
        </div>
      </div>
    </div>
  );
}

