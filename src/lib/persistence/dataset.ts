import { get, set, del } from "idb-keyval";
import { getMonth, getDate, getDay } from "date-fns";

import type { Dataset } from "@/lib/data-processing/types";
import { parseLooseDate } from "@/lib/utils/date";
import {
  FECHA_GESTION_PERIOD_END,
  FECHA_GESTION_PERIOD_START,
  resolveSemanaLabel,
} from "@/lib/utils/semana";

const KEY = "powerbi-web:dataset:v1";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function reviveDataset(ds: Dataset): Dataset {
  if (!ds || !ds.rows) return ds;
  for (const r of ds.rows) {
    r.fechaCarga = parseLooseDate(r.fechaCarga) ?? null;
    r.fechaGestion = parseLooseDate(r.fechaGestion, {
      minDate: FECHA_GESTION_PERIOD_START,
      maxDate: FECHA_GESTION_PERIOD_END,
    }) ?? null;
    r.fechaAf = parseLooseDate(r.fechaAf) ?? null;
    r.fechaMc = parseLooseDate(r.fechaMc) ?? null;
    r.semana = resolveSemanaLabel(r.fechaGestion, r.semana);

    // Recompute derived fields from Fecha Gestion to keep filters/charts consistent.
    if (r.fechaGestion) {
      r.mes = getMonth(r.fechaGestion) + 1;
      r.diaNumero = getDate(r.fechaGestion);
      r.diaSemana = DIAS_SEMANA[getDay(r.fechaGestion)] ?? null;
    } else {
      r.mes = null;
      r.diaNumero = null;
      r.diaSemana = null;
    }
  }
  return ds;
}

export async function loadPersistedDataset(): Promise<Dataset | null> {
  const value = await get(KEY);
  if (!value) return null;
  return reviveDataset(value as Dataset);
}

export async function persistDataset(dataset: Dataset): Promise<void> {
  await set(KEY, dataset);
}

export async function clearPersistedDataset(): Promise<void> {
  await del(KEY);
}
