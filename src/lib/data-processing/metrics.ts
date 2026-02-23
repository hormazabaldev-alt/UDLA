import type { DataRow } from "@/lib/data-processing/types";
import { normalizeRut } from "@/lib/utils/rut";
import { isInteresaViene } from "@/lib/utils/interesa";

export type Totals = {
  cargada: number;
  recorrido: number;
  contactado: number;
  citas: number;
  af: number;
  mc: number;
  // Unique RUT volumes (dedup by Rut Base)
  cargadaRutUnico: number;
  recorridoRutUnico: number;
  contactadoRutUnico: number;
  citasRutUnico: number;
  afRutUnico: number;
  mcRutUnico: number;
  // Core rates (based on RUT único)
  tcLlaLeads: number | null;        // Recorrido / Base
  tcAfLeads: number | null;         // AF / Base
  tcContLla: number | null;         // Contactado / Recorrido
  cCitasRecorrido: number | null;   // Citas / Recorrido
  cCitasCon: number | null;         // Citas / Contactado
  tcAfCitas: number | null;         // AF / Citas
  tcMcAf: number | null;            // MC / AF
  cMcLeads: number | null;          // MC / Base
  // Legacy
  pctContactabilidad: number | null;
  pctEfectividad: number | null;
  tcAf: number | null;
  tcMc: number | null; // Alias of tcMcAf
};

export function computeTotals(rows: DataRow[]): Totals {
  let cargada = 0;
  let recorrido = 0;
  let contactado = 0;
  let af = 0;
  let mc = 0;

  const cargadaRuts = new Set<string>();
  const recorridoRuts = new Set<string>();
  const contactadoRuts = new Set<string>();
  const citasRuts = new Set<string>();
  const afRuts = new Set<string>();
  const mcRuts = new Set<string>();

  for (const row of rows) {
    // BASE (Cargada) = total de filas
    cargada++;
    const rut = normalizeRut(row.rutBase);
    if (rut) cargadaRuts.add(rut);

    // RECORRIDO = contar filas donde "Conecta" es "Conecta" o "No Conecta"
    const conectaVal = row.conecta?.trim().toLowerCase() ?? "";
    if (conectaVal === "conecta" || conectaVal === "no conecta") {
      recorrido++;
      if (rut) recorridoRuts.add(rut);
    }

    // CONTACTABILIDAD EXITOSA (Contactado) = contar solo "Conecta"
    if (conectaVal === "conecta") {
      contactado++;
      if (rut) contactadoRuts.add(rut);
    }

    // CITAS = contar filas donde "Interesa" = "Viene"
    if (isInteresaViene(row.interesa)) {
      if (rut) citasRuts.add(rut);
    }

    // AFLUENCIA (AF) = contar filas donde columna AF contiene "A", "MC" o "M"
    const afVal = row.af?.trim().toUpperCase() ?? "";
    if (afVal === "A" || afVal === "MC" || afVal === "M") {
      af++;
      if (rut) afRuts.add(rut);
    }

    // MATRÍCULAS (MC) = contar filas donde columna MC contiene "M" o "MC"
    const mcVal = row.mc?.trim().toUpperCase() ?? "";
    if (mcVal === "M" || mcVal === "MC") {
      mc++;
      if (rut) mcRuts.add(rut);
    }
  }

  const citas = citasRuts.size;
  const cargadaRutUnico = cargadaRuts.size;
  const recorridoRutUnico = recorridoRuts.size;
  const contactadoRutUnico = contactadoRuts.size;
  const citasRutUnico = citasRuts.size;
  const afRutUnico = afRuts.size;
  const mcRutUnico = mcRuts.size;

  // Rates are computed on RUT único to avoid duplicate attempts inflating denominators.
  // TC% Lla/Leads = Recorrido / Base Cargada
  const tcLlaLeads = cargadaRutUnico > 0 ? recorridoRutUnico / cargadaRutUnico : null;
  // TC% AF/Leads = AF / Base Cargada
  const tcAfLeads = cargadaRutUnico > 0 ? afRutUnico / cargadaRutUnico : null;
  // TC% Cont/Lla = Contactado / Recorrido
  const tcContLla = recorridoRutUnico > 0 ? contactadoRutUnico / recorridoRutUnico : null;
  // C% Citas/Recorrido = Citas / Recorrido
  const cCitasRecorrido = recorridoRutUnico > 0 ? citasRutUnico / recorridoRutUnico : null;
  // C% Citas/Con = Citas / Contactado
  const cCitasCon = contactadoRutUnico > 0 ? citasRutUnico / contactadoRutUnico : null;
  // TC% AF/Citas = AF / Citas
  const tcAfCitas = citasRutUnico > 0 ? afRutUnico / citasRutUnico : null;
  // TC% MC/AF = MC / AF
  const tcMcAf = afRutUnico > 0 ? mcRutUnico / afRutUnico : null;
  // C% MC/Leads = MC / Base Cargada
  const cMcLeads = cargadaRutUnico > 0 ? mcRutUnico / cargadaRutUnico : null;

  // Legacy aliases (keep backward compat)
  const pctContactabilidad = tcContLla;
  const pctEfectividad = citas > 0 ? (af + mc) / citas : null;
  const tcAf = tcAfCitas;
  const tcMc = tcMcAf;

  return {
    cargada,
    recorrido,
    contactado,
    citas,
    af,
    mc,
    cargadaRutUnico,
    recorridoRutUnico,
    contactadoRutUnico,
    citasRutUnico,
    afRutUnico,
    mcRutUnico,
    // Core rates
    tcLlaLeads,
    tcAfLeads,
    tcContLla,
    cCitasRecorrido,
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
  // Discover all unique tipoBase values
  const allTipos = Array.from(new Set(rows.map(r => r.tipoBase).filter(v => !!v))).sort();

  // Group by Year-Month (from Fecha Gestion) x TipoBase
  // Key format: YYYYMM (e.g. 202602)
  const grouped = new Map<number, Map<string, number>>();

  for (const row of rows) {
    if (row.fechaGestion && row.tipoBase) {
      const ym = row.fechaGestion.getFullYear() * 100 + (row.fechaGestion.getMonth() + 1);
      if (!grouped.has(ym)) grouped.set(ym, new Map());
      const monthMap = grouped.get(ym)!;
      monthMap.set(row.tipoBase, (monthMap.get(row.tipoBase) || 0) + 1);
    }
  }

  const months = Array.from(grouped.keys()).sort((a, b) => a - b);
  const labels = months.map((ym) => {
    const year = Math.floor(ym / 100);
    const month = ym % 100;
    const d = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat("es-CL", { month: "short", year: "numeric" }).format(d);
  });

  const datasets = allTipos.map(tipo => ({
    label: tipo,
    data: months.map(m => grouped.get(m)?.get(tipo) || 0),
  }));

  return { labels, datasets };
}
