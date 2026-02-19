"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export function PreviewGrid({
  rows,
  height = 320,
}: {
  rows: Record<string, unknown>[];
  height?: number;
}) {
  const columnDefs = useMemo<ColDef[]>(() => {
    const first = rows[0];
    if (!first) return [];
    return Object.keys(first).map((key) => ({
      headerName: key,
      field: key,
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 120,
    }));
  }, [rows]);

  return (
    <div className="ag-theme-quartz-dark w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17]">
      <div style={{ height }}>
        <AgGridReact
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          animateRows
          rowHeight={40}
          headerHeight={44}
          suppressCellFocus
          pagination={false}
        />
      </div>
    </div>
  );
}
