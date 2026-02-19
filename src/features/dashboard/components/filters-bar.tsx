"use client";

import { FilterX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BaseType } from "@/lib/data-processing/types";
import { useFilters } from "@/features/dashboard/hooks/useFilters";

export function FiltersBar() {
  const { filters, set, resetFilters, options } = useFilters();

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-white/55">
                Tipo de base
              </div>
              <Select
                value={filters.tipo}
                onValueChange={(v) =>
                  set({ tipo: v as BaseType | "All", diaNumero: "All" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Todos</SelectItem>
                  <SelectItem value="Stock">Stock</SelectItem>
                  <SelectItem value="Web">Web</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-white/55">Mes</div>
              <Select
                value={String(filters.mes)}
                onValueChange={(v) =>
                  set({ mes: v === "All" ? "All" : Number(v), diaNumero: "All" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Todos</SelectItem>
                  {options.meses.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {`Mes ${m}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-white/55">Día</div>
              <Select
                value={String(filters.diaNumero)}
                onValueChange={(v) =>
                  set({ diaNumero: v === "All" ? "All" : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Todos</SelectItem>
                  {options.dias.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {`Día ${d}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="ghost" onClick={() => resetFilters()}>
            <FilterX className="size-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

