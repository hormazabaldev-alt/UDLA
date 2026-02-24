import type { DataRow } from "@/lib/data-processing/types";
import { normalizeRut } from "@/lib/utils/rut";
import { isInteresaViene } from "@/lib/utils/interesa";
import { compareSemanaLabels } from "@/lib/utils/semana";

export type ResumenSemanalRow = {
  semana: string;
  base: number;
  citas: number;
  recorrido: number;
  afluencias: number;
  matriculas: number;
  pctRecorrido: number; // 0..1
  pctAfluencia: number; // 0..1
  pctMatriculas: number; // 0..1
};

export type ResumenExclusion = {
  invalidRows: number; // sin Rut Base válido
  missingSemana: number; // Semana vacía/null
};

export type ResumenSemanalResult = {
  rows: ResumenSemanalRow[];
  totals: ResumenSemanalRow;
  excluded: ResumenExclusion;
};

function safeDiv(n: number, d: number) {
  return d > 0 ? n / d : 0;
}

function norm(v: string | null | undefined) {
  const s = v?.trim() ?? "";
  return s.length > 0 ? s : null;
}

export function isValidCitaRow(row: DataRow) {
  return !!normalizeRut(row.rutBase);
}

export function isRecorridoRow(row: DataRow) {
  const c = row.conecta?.trim().toLowerCase() ?? "";
  return c === "conecta" || c === "no conecta";
}

export function isCitaRow(row: DataRow) {
  return isInteresaViene(row.interesa);
}

export function isMatriculaRow(row: DataRow) {
  const mc = row.mc?.trim().toUpperCase() ?? "";
  return mc === "M" || mc === "MC";
}

export function isAfTotalRow(row: DataRow) {
  const af = row.af?.trim().toUpperCase() ?? "";
  return af === "A" || af === "MC" || af === "M";
}

export function calcResumenSemanal(
  rows: DataRow[],
  opts?: {
    excludeMissingSemana?: boolean;
    afluenciaValues?: ReadonlySet<string>;
  },
): ResumenSemanalResult {
  const excludeMissingSemana = opts?.excludeMissingSemana ?? true;
  // Backward compat: opts.afluenciaValues is ignored (AF comes from columna `AF`).

  const excluded: ResumenExclusion = { invalidRows: 0, missingSemana: 0 };
  const groups = new Map<
    string,
    {
      base: number;
      recorrido: number;
      citas: number;
      afluencias: number;
      matriculas: number;
    }
  >();

  for (const r of rows) {
    if (!isValidCitaRow(r)) {
      excluded.invalidRows++;
      continue;
    }

    const semana = norm(r.semana);
    if (!semana) {
      excluded.missingSemana++;
      if (excludeMissingSemana) continue;
    }

    const key = semana ?? "Semana N/A";
    if (!groups.has(key)) {
      groups.set(key, {
        base: 0,
        recorrido: 0,
        citas: 0,
        afluencias: 0,
        matriculas: 0,
      });
    }

    const g = groups.get(key)!;
    g.base++;
    if (isRecorridoRow(r)) g.recorrido++;
    if (isCitaRow(r)) g.citas++;
    if (isAfTotalRow(r)) g.afluencias++;
    if (isMatriculaRow(r)) g.matriculas++;
  }

  const sortedWeeks = Array.from(groups.keys()).sort(compareSemanaLabels);

  const resumenRows: ResumenSemanalRow[] = sortedWeeks.map((semana) => {
    const g = groups.get(semana)!;
    return {
      semana,
      base: g.base,
      citas: g.citas,
      recorrido: g.recorrido,
      afluencias: g.afluencias,
      matriculas: g.matriculas,
      // Definiciones:
      // - % Recorrido = Recorrido / Base
      // - % Afluencia = Afluencias / Citas
      // - % Matrículas = Matrículas / Afluencias
      pctRecorrido: safeDiv(g.recorrido, g.base),
      pctAfluencia: safeDiv(g.afluencias, g.citas),
      pctMatriculas: safeDiv(g.matriculas, g.afluencias),
    };
  });

  const totalsCounts = resumenRows.reduce(
    (acc, r) => {
      acc.base += r.base;
      acc.citas += r.citas;
      acc.recorrido += r.recorrido;
      acc.afluencias += r.afluencias;
      acc.matriculas += r.matriculas;
      return acc;
    },
    { base: 0, citas: 0, recorrido: 0, afluencias: 0, matriculas: 0 },
  );

  const totals: ResumenSemanalRow = {
    semana: "TOTALES",
    ...totalsCounts,
    pctRecorrido: safeDiv(totalsCounts.recorrido, totalsCounts.base),
    pctAfluencia: safeDiv(totalsCounts.afluencias, totalsCounts.citas),
    pctMatriculas: safeDiv(totalsCounts.matriculas, totalsCounts.afluencias),
  };

  return { rows: resumenRows, totals, excluded };
}

export function runResumenSemanalSanityChecks(res: ResumenSemanalResult) {
  const sum = res.rows.reduce(
    (acc, r) => {
      acc.base += r.base;
      acc.citas += r.citas;
      acc.recorrido += r.recorrido;
      acc.afluencias += r.afluencias;
      acc.matriculas += r.matriculas;
      return acc;
    },
    { base: 0, citas: 0, recorrido: 0, afluencias: 0, matriculas: 0 },
  );

  const ok =
    sum.base === res.totals.base &&
    sum.citas === res.totals.citas &&
    sum.recorrido === res.totals.recorrido &&
    sum.afluencias === res.totals.afluencias &&
    sum.matriculas === res.totals.matriculas;

  return {
    ok,
    message: ok
      ? "ResumenSemanal sanity OK"
      : `ResumenSemanal mismatch: sum=${JSON.stringify(sum)} totals=${JSON.stringify({
        base: res.totals.base,
        citas: res.totals.citas,
        recorrido: res.totals.recorrido,
        afluencias: res.totals.afluencias,
        matriculas: res.totals.matriculas,
      })}`,
  };
}
