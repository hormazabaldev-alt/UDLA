import type { DataRow } from "@/lib/data-processing/types";
import { isRecorridoConecta } from "@/lib/data-processing/predicates";
import { getSemanaCorrelativaLabel } from "@/lib/utils/semana";
import { toCampusCode } from "@/lib/utils/campus";
import { isInteresaViene, isInteresaNoGestionado } from "@/lib/utils/interesa";
import { isNoGestionadoConecta } from "@/lib/data-processing/predicates";

export const NO_ASIGNADO = "No asignado";

export type AgentFilters = {
  meses: number[];
  semanas: string[];
  regimenes: string[];
  sedesInteres: string[];
  afValues: string[];
  mcValues: string[];
  afCampus: string[];
  mcCampus: string[];
  conecta: string[];
  agentes: string[];
  marketing5: string[];
  codigoBanner: string[];
  carreraInteres: string[];
};

export type RowProductivity = {
  totalGestiones: number;
  conectaTotal: number;
  noGestionadoConectaTotal: number;
  interesaTotal: number;
  noGestionadoInteresaTotal: number;
  pctConecta: number;
  pctInteresa: number;
  pctInteresaSobreConecta: number;
};

export type AgentAggregateRow = { agente: string } & RowProductivity;
export type MarketingAggregateRow = { marketing5: string } & RowProductivity;
export type CarreraAggregateRow = { carreraInteres: string } & RowProductivity;
export type ComboAggregateRow = {
  marketing5: string;
  carreraInteres: string;
  codigoBanner: string;
} & RowProductivity;

type ApplyAgentFilterOptions = {
  includeTemporal?: boolean;
};

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function campaignMonthSortKey(month: number) {
  return month >= 8 ? month - 8 : month + 4;
}

function rowDate(row: DataRow): Date | null {
  if (isValidDate(row.fechaGestion)) return row.fechaGestion;
  if (isValidDate(row.fechaCarga)) return row.fechaCarga;
  return null;
}

function normText(value: string | null | undefined): string {
  const s = value?.trim() ?? "";
  return s.length > 0 ? s : NO_ASIGNADO;
}

function normCampus(value: string | null | undefined): string {
  const s = value?.trim() ?? "";
  if (!s) return NO_ASIGNADO;
  const code = toCampusCode(s);
  return code.trim().length > 0 ? code : NO_ASIGNADO;
}

function normConecta(value: string | null | undefined): string {
  const s = value?.trim() ?? "";
  return s.length > 0 ? s : NO_ASIGNADO;
}

function normUpper(value: string | null | undefined): string {
  const s = value?.trim().toUpperCase() ?? "";
  return s.length > 0 ? s : NO_ASIGNADO;
}

function inSelection(selected: string[], value: string): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

export function applyAgentFilters(
  rows: DataRow[],
  filters: AgentFilters,
  opts?: ApplyAgentFilterOptions,
): DataRow[] {
  const includeTemporal = opts?.includeTemporal ?? true;

  return rows.filter((row) => {
    const d = rowDate(row);
    if (includeTemporal && filters.meses.length > 0) {
      if (!d) return false;
      const month = d.getMonth() + 1;
      if (!filters.meses.includes(month)) return false;
    }

    if (includeTemporal && !inSelection(filters.semanas, normText(row.semana))) return false;
    if (!inSelection(filters.regimenes, normText(row.regimen))) return false;
    if (!inSelection(filters.sedesInteres, normCampus(row.sedeInteres))) return false;
    if (!inSelection(filters.afValues, normUpper(row.af))) return false;
    if (!inSelection(filters.mcValues, normUpper(row.mc))) return false;
    if (!inSelection(filters.afCampus, normCampus(row.afCampus))) return false;
    if (!inSelection(filters.mcCampus, normCampus(row.mcCampus))) return false;
    if (!inSelection(filters.conecta, normConecta(row.conecta))) return false;
    if (!inSelection(filters.agentes, normText(row.agente))) return false;
    if (!inSelection(filters.marketing5, normText(row.marketing5))) return false;
    if (!inSelection(filters.codigoBanner, normText(row.codigoBanner))) return false;
    if (!inSelection(filters.carreraInteres, normText(row.carreraInteres))) return false;
    return true;
  });
}

export function computeRowProductivity(rows: DataRow[]): RowProductivity {
  const totalGestiones = rows.length;
  let conectaTotal = 0;
  let noGestionadoConectaTotal = 0;
  let interesaTotal = 0;
  let noGestionadoInteresaTotal = 0;

  for (const row of rows) {
    if (isRecorridoConecta(row.conecta)) conectaTotal++;
    if (isNoGestionadoConecta(row.conecta)) noGestionadoConectaTotal++;
    if (isInteresaViene(row.interesa)) interesaTotal++;
    if (isInteresaNoGestionado(row.interesa)) noGestionadoInteresaTotal++;
  }

  return {
    totalGestiones,
    conectaTotal,
    noGestionadoConectaTotal,
    interesaTotal,
    noGestionadoInteresaTotal,
    pctConecta: totalGestiones > 0 ? conectaTotal / totalGestiones : 0,
    pctInteresa: totalGestiones > 0 ? interesaTotal / totalGestiones : 0,
    pctInteresaSobreConecta: conectaTotal > 0 ? interesaTotal / conectaTotal : 0,
  };
}

type Acc = {
  totalGestiones: number;
  conectaTotal: number;
  noGestionadoConectaTotal: number;
  interesaTotal: number;
  noGestionadoInteresaTotal: number;
};

function createAcc(): Acc {
  return {
    totalGestiones: 0,
    conectaTotal: 0,
    noGestionadoConectaTotal: 0,
    interesaTotal: 0,
    noGestionadoInteresaTotal: 0,
  };
}

function toProductivity(acc: Acc): RowProductivity {
  return {
    totalGestiones: acc.totalGestiones,
    conectaTotal: acc.conectaTotal,
    noGestionadoConectaTotal: acc.noGestionadoConectaTotal,
    interesaTotal: acc.interesaTotal,
    noGestionadoInteresaTotal: acc.noGestionadoInteresaTotal,
    pctConecta: acc.totalGestiones > 0 ? acc.conectaTotal / acc.totalGestiones : 0,
    pctInteresa: acc.totalGestiones > 0 ? acc.interesaTotal / acc.totalGestiones : 0,
    pctInteresaSobreConecta: acc.conectaTotal > 0 ? acc.interesaTotal / acc.conectaTotal : 0,
  };
}

function compareByTotalDesc(
  a: { totalGestiones: number; interesaTotal: number },
  b: { totalGestiones: number; interesaTotal: number },
) {
  if (b.totalGestiones !== a.totalGestiones) return b.totalGestiones - a.totalGestiones;
  return b.interesaTotal - a.interesaTotal;
}

export function aggByAgent(rows: DataRow[]): AgentAggregateRow[] {
  const groups = new Map<string, Acc>();
  for (const row of rows) {
    const key = normText(row.agente);
    if (!groups.has(key)) groups.set(key, createAcc());
    const g = groups.get(key)!;
    g.totalGestiones++;
    if (isRecorridoConecta(row.conecta)) g.conectaTotal++;
    if (isNoGestionadoConecta(row.conecta)) g.noGestionadoConectaTotal++;
    if (isInteresaViene(row.interesa)) g.interesaTotal++;
    if (isInteresaNoGestionado(row.interesa)) g.noGestionadoInteresaTotal++;
  }

  return Array.from(groups.entries())
    .map(([agente, acc]) => ({ agente, ...toProductivity(acc) }))
    .sort(compareByTotalDesc);
}

export function aggByMarketing(rows: DataRow[]): MarketingAggregateRow[] {
  const groups = new Map<string, Acc>();
  for (const row of rows) {
    const key = normText(row.marketing5);
    if (!groups.has(key)) groups.set(key, createAcc());
    const g = groups.get(key)!;
    g.totalGestiones++;
    if (isRecorridoConecta(row.conecta)) g.conectaTotal++;
    if (isNoGestionadoConecta(row.conecta)) g.noGestionadoConectaTotal++;
    if (isInteresaViene(row.interesa)) g.interesaTotal++;
    if (isInteresaNoGestionado(row.interesa)) g.noGestionadoInteresaTotal++;
  }

  return Array.from(groups.entries())
    .map(([marketing5, acc]) => ({ marketing5, ...toProductivity(acc) }))
    .sort(compareByTotalDesc);
}

export function aggByCarrera(rows: DataRow[]): CarreraAggregateRow[] {
  const groups = new Map<string, Acc>();
  for (const row of rows) {
    const key = normText(row.carreraInteres);
    if (!groups.has(key)) groups.set(key, createAcc());
    const g = groups.get(key)!;
    g.totalGestiones++;
    if (isRecorridoConecta(row.conecta)) g.conectaTotal++;
    if (isNoGestionadoConecta(row.conecta)) g.noGestionadoConectaTotal++;
    if (isInteresaViene(row.interesa)) g.interesaTotal++;
    if (isInteresaNoGestionado(row.interesa)) g.noGestionadoInteresaTotal++;
  }

  return Array.from(groups.entries())
    .map(([carreraInteres, acc]) => ({ carreraInteres, ...toProductivity(acc) }))
    .sort(compareByTotalDesc);
}

export function aggByCombo(
  rows: DataRow[],
  opts?: { minTotal?: number; limit?: number },
): ComboAggregateRow[] {
  const minTotal = opts?.minTotal ?? 20;
  const limit = opts?.limit ?? 10;
  const groups = new Map<string, { labels: { marketing5: string; carreraInteres: string; codigoBanner: string }; acc: Acc }>();

  for (const row of rows) {
    const marketing5 = normText(row.marketing5);
    const carreraInteres = normText(row.carreraInteres);
    const codigoBanner = normText(row.codigoBanner);
    const key = `${marketing5}||${carreraInteres}||${codigoBanner}`;
    if (!groups.has(key)) {
      groups.set(key, {
        labels: { marketing5, carreraInteres, codigoBanner },
        acc: createAcc(),
      });
    }
    const g = groups.get(key)!.acc;
    g.totalGestiones++;
    if (isRecorridoConecta(row.conecta)) g.conectaTotal++;
    if (isNoGestionadoConecta(row.conecta)) g.noGestionadoConectaTotal++;
    if (isInteresaViene(row.interesa)) g.interesaTotal++;
    if (isInteresaNoGestionado(row.interesa)) g.noGestionadoInteresaTotal++;
  }

  return Array.from(groups.values())
    .map(({ labels, acc }) => ({ ...labels, ...toProductivity(acc) }))
    .filter((row) => row.totalGestiones >= minTotal)
    .sort((a, b) => {
      if (b.pctInteresa !== a.pctInteresa) return b.pctInteresa - a.pctInteresa;
      return compareByTotalDesc(a, b);
    })
    .slice(0, limit);
}

export function collectAgentFilterOptions(rows: DataRow[]) {
  const dates = rows
    .flatMap((r) => [rowDate(r), r.fechaAf, r.fechaMc])
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());

  const semanas = Array.from(
    new Set(
      rows.flatMap((row) => [
        normText(row.semana),
        getSemanaCorrelativaLabel(row.fechaAf),
        getSemanaCorrelativaLabel(row.fechaMc),
      ]).filter((value): value is string => !!value),
    ),
  ).sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));

  const unique = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));

  return {
    minDate: dates[0] ?? null,
    maxDate: dates[dates.length - 1] ?? null,
    meses: Array.from(new Set(dates.map((date) => date.getMonth() + 1))).sort((a, b) => campaignMonthSortKey(a) - campaignMonthSortKey(b)),
    semanas,
    regimenes: unique(rows.map((r) => normText(r.regimen))),
    sedesInteres: unique(rows.map((r) => normCampus(r.sedeInteres))),
    afValues: unique(rows.map((r) => normUpper(r.af))),
    mcValues: unique(rows.map((r) => normUpper(r.mc))),
    afCampus: unique(rows.map((r) => normCampus(r.afCampus))),
    mcCampus: unique(rows.map((r) => normCampus(r.mcCampus))),
    conecta: unique(rows.map((r) => normConecta(r.conecta))),
    agentes: unique(rows.map((r) => normText(r.agente))),
    marketing5: unique(rows.map((r) => normText(r.marketing5))),
    codigoBanner: unique(rows.map((r) => normText(r.codigoBanner))),
    carreraInteres: unique(rows.map((r) => normText(r.carreraInteres))),
  };
}
