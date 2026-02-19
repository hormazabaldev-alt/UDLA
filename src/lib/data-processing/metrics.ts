import type { DataRow } from "@/lib/data-processing/types";

export type Totals = {
  cargada: number;
  recorrido: number;
  contactado: number;
  citas: number;
  af: number;
  mc: number;
  // 6 core rates
  tcLlaLeads: number | null;   // Recorrido / Base
  tcContLla: number | null;    // Contactado / Recorrido
  cCitasCon: number | null;    // Citas / Contactado
  tcAfCitas: number | null;    // AF / Citas
  tcMcAf: number | null;       // MC / AF
  cMcLeads: number | null;     // MC / Base
  // Legacy
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

    // CITAS = contar filas donde "Interesa" = "Viene"
    const interesaVal = row.interesa?.trim().toLowerCase() ?? "";
    if (interesaVal === "viene") {
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

  // TC% Lla/Leads = Recorrido / Base Cargada
  const tcLlaLeads = cargada > 0 ? recorrido / cargada : null;
  // TC% Cont/Lla = Contactado / Recorrido
  const tcContLla = recorrido > 0 ? contactado / recorrido : null;
  // C% Citas/Con = Citas / Contactado
  const cCitasCon = contactado > 0 ? citas / contactado : null;
  // TC% AF/Citas = AF / Citas
  const tcAfCitas = citas > 0 ? af / citas : null;
  // TC% MC/AF = MC / AF
  const tcMcAf = af > 0 ? mc / af : null;
  // C% MC/Leads = MC / Base Cargada
  const cMcLeads = cargada > 0 ? mc / cargada : null;

  // Legacy aliases (keep backward compat)
  const pctContactabilidad = tcContLla;
  const pctEfectividad = citas > 0 ? (af + mc) / citas : null;
  const tcAf = tcAfCitas;
  const tcMc = citas > 0 ? mc / citas : null;

  return {
    cargada,
    recorrido,
    contactado,
    citas,
    af,
    mc,
    // New 6 rates
    tcLlaLeads,
    tcContLla,
    cCitasCon,
    tcAfCitas,
    tcMcAf,
    cMcLeads,
    // Legacy
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
