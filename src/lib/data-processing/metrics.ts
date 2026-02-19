import type { DataRow } from "@/lib/data-processing/types";

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

export function computeTotals(rows: DataRow[]): Totals {
  let cargada = 0;
  let recorrido = 0;
  let contactado = 0;
  let citas = 0;
  let af = 0;
  let mc = 0;

  for (const row of rows) {
    // BASE (Cargada) = total de filas
    cargada++;

    // RECORRIDO = contar filas donde "Conecta" es "Conecta" o "No Conecta"
    const conectaVal = row.conecta?.trim().toLowerCase() ?? "";
    if (conectaVal === "conecta" || conectaVal === "no conecta") {
      recorrido++;
    }

    // CONTACTABILIDAD EXITOSA (Contactado) = contar solo "Conecta"
    if (conectaVal === "conecta") {
      contactado++;
    }

    // CITAS = contar filas donde "Interesa" tiene algún valor (no vacío/null)
    const interesaVal = row.interesa?.trim() ?? "";
    if (interesaVal.length > 0) {
      citas++;
    }

    // AFLUENCIA (AF) = contar filas donde columna AF contiene "A", "MC" o "M"
    const afVal = row.af?.trim().toUpperCase() ?? "";
    if (afVal === "A" || afVal === "MC" || afVal === "M") {
      af++;
    }

    // MATRÍCULAS (MC) = contar filas donde columna MC contiene "M" o "MC"
    const mcVal = row.mc?.trim().toUpperCase() ?? "";
    if (mcVal === "M" || mcVal === "MC") {
      mc++;
    }
  }

  // % Contactabilidad = Contactado / Recorrido
  const pctContactabilidad = recorrido > 0 ? contactado / recorrido : null;
  // % Efectividad = (AF + MC) / Citas
  const pctEfectividad = citas > 0 ? (af + mc) / citas : null;
  // Tasa Conversión AF = AF / Citas
  const tcAf = citas > 0 ? af / citas : null;
  // Tasa Conversión MC = MC / Citas
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

export function computeTrend(rows: DataRow[]) {
  // Group by Month (using Mes field)
  const grouped = new Map<number, { stock: number; web: number }>();

  for (const row of rows) {
    if (row.mes) {
      const current = grouped.get(row.mes) || { stock: 0, web: 0 };
      if (row.tipoBase?.toLowerCase().includes("web")) {
        current.web++;
      } else {
        // Assume anything not Web is Stock/Base
        current.stock++;
      }
      grouped.set(row.mes, current);
    }
  }

  // Sort by month
  const months = Array.from(grouped.keys()).sort((a, b) => a - b);
  const labels = months.map(m => `Mes ${m}`);
  const dataStock = months.map(m => grouped.get(m)?.stock || 0);
  const dataWeb = months.map(m => grouped.get(m)?.web || 0);

  return {
    labels,
    datasets: [
      { label: "Stock", data: dataStock },
      { label: "Web", data: dataWeb },
    ],
  };
}
