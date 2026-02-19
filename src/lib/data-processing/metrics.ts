import type { Dataset, NormalizedRow } from "@/lib/data-processing/types";

export type Totals = {
  cargada: number;
  recorrido: number;
  contactado: number;
  citas: number;
  af: number;
  mc: number;
  pctContactabilidad: number | null;
  pctEfectividad: number | null;
  tcAf: number | null;
  tcMc: number | null;
};

export function computeTotals(rows: NormalizedRow[]): Totals {
  let cargada = 0;
  let recorrido = 0;
  let contactado = 0;
  let citas = 0;
  let af = 0;
  let mc = 0;

  for (const r of rows) {
    cargada += r.cargada;
    recorrido += r.recorrido;
    contactado += r.contactado;
    citas += r.citas;
    af += r.af;
    mc += r.mc;
  }

  const pctContactabilidad = recorrido > 0 ? contactado / recorrido : null;
  const pctEfectividad = citas > 0 ? (af + mc) / citas : null;
  const tcAf = citas > 0 ? af / citas : null;
  const tcMc = citas > 0 ? mc / citas : null;

  return {
    cargada,
    recorrido,
    contactado,
    citas,
    af,
    mc,
    pctContactabilidad,
    pctEfectividad,
    tcAf,
    tcMc,
  };
}

export function computeTotalsForDataset(dataset: Dataset): Totals {
  return computeTotals(dataset.rows);
}

