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

  const uniqueRuts = new Set<string>();

  for (const row of rows) {
    if (row.rutBase) uniqueRuts.add(row.rutBase);
    // Asumiendo Cargada = Total registros en la base (filas). 
    // Si fuera Ruts únicos: cargada = uniqueRuts.size al final.
    // El usuario tiene "Fecha Carga", cada fila cuenta como un registro cargado.
    cargada++;

    if (row.fechaGestion) {
      recorrido++;
    }

    if (row.conecta?.toLowerCase() === "conecta") {
      contactado++;
    }

    // Lógica para Citas: "Viene" en Interesa, o tiene fecha AF/MC, o AF/MC están marcados
    // Ajustar según reglas de negocio exactas. Por ahora:
    if (row.interesa?.toLowerCase().includes("viene") || row.interesa?.toLowerCase() === "agendado") {
      citas++;
    } else if (row.af || row.mc) {
      // Fallback: si tiene AF o MC, asumimos que hubo cita
      citas++;
    }

    if (row.af) {
      af++;
    }

    if (row.mc) {
      mc++;
    }
  }

  const pctContactabilidad = recorrido > 0 ? contactado / recorrido : null;
  const pctEfectividad = citas > 0 ? (af + mc) / citas : null; // Asumiendo Efectividad = (Ventas) / Citas
  // O quizás Efectividad = Citas / Contactado?
  // Basado en TopKpis anterior: pctEfectividad usaba (af + mc) / citas? No recuerdo exacto.
  // Revisemos el componente TopKpis antiguo.
  // El antiguo decía: pctEfectividadComputed = citas > 0 ? (af + mc) / citas : null;

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
