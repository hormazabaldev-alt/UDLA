import type { DataRow } from "@/lib/data-processing/types";

export type ResumenSemanalRow = {
  semana: string;
  citas: number;
  recorrido: number;
  usables: number;
  afluencias: number;
  matriculas: number;
  pctRecorrido: number; // 0..1
  pctUsables: number; // 0..1
  pctAfluencia: number; // 0..1
  pctMatriculas: number; // 0..1
};

export type ResumenExclusion = {
  invalidCitas: number; // sin Rut Base o sin Fecha Carga
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

function equalsCi(a: string | null | undefined, b: string) {
  return (a?.trim().toLocaleLowerCase() ?? "") === b.toLocaleLowerCase();
}

function isValidDate(d: Date | null) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

export function isValidCitaRow(row: DataRow) {
  return !!norm(row.rutBase) && isValidDate(row.fechaCarga);
}

export function isRecorridoRow(row: DataRow) {
  return isValidDate(row.fechaGestion);
}

export function isUsableRow(row: DataRow) {
  return equalsCi(row.conecta, "Conecta");
}

export function isAfluenciaRow(row: DataRow, values: ReadonlySet<string> = new Set(["viene"])) {
  const interesa = row.interesa?.trim().toLocaleLowerCase() ?? "";
  if (!interesa) return false;
  for (const v of values) {
    if (interesa === v.trim().toLocaleLowerCase()) return true;
  }
  return false;
}

export function isMatriculaRow(row: DataRow) {
  return !!norm(row.mc);
}

export function isAfTotalRow(row: DataRow) {
  return !!norm(row.af);
}

export function calcResumenSemanal(
  rows: DataRow[],
  opts?: {
    excludeMissingSemana?: boolean;
    afluenciaValues?: ReadonlySet<string>;
  },
): ResumenSemanalResult {
  const excludeMissingSemana = opts?.excludeMissingSemana ?? true;
  const afluenciaValues = opts?.afluenciaValues ?? new Set(["viene"]);

  const excluded: ResumenExclusion = { invalidCitas: 0, missingSemana: 0 };
  const groups = new Map<string, Omit<ResumenSemanalRow, "semana" | "pctRecorrido" | "pctUsables" | "pctAfluencia" | "pctMatriculas">>();

  for (const r of rows) {
    if (!isValidCitaRow(r)) {
      excluded.invalidCitas++;
      continue;
    }

    const semana = norm(r.semana);
    if (!semana) {
      excluded.missingSemana++;
      if (excludeMissingSemana) continue;
    }

    const key = semana ?? "Semana N/A";
    if (!groups.has(key)) {
      groups.set(key, { citas: 0, recorrido: 0, usables: 0, afluencias: 0, matriculas: 0 });
    }

    const g = groups.get(key)!;
    g.citas++;
    if (isRecorridoRow(r)) g.recorrido++;
    if (isUsableRow(r)) g.usables++;
    if (isAfluenciaRow(r, afluenciaValues)) g.afluencias++;
    if (isMatriculaRow(r)) g.matriculas++;
  }

  const sortedWeeks = Array.from(groups.keys()).sort((a, b) => {
    const na = Number.parseInt(a.replace(/\D/g, ""), 10);
    const nb = Number.parseInt(b.replace(/\D/g, ""), 10);
    const aNum = Number.isFinite(na) ? na : 0;
    const bNum = Number.isFinite(nb) ? nb : 0;
    if (aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b, "es");
  });

  const resumenRows: ResumenSemanalRow[] = sortedWeeks.map((semana) => {
    const g = groups.get(semana)!;
    return {
      semana,
      citas: g.citas,
      recorrido: g.recorrido,
      usables: g.usables,
      afluencias: g.afluencias,
      matriculas: g.matriculas,
      pctRecorrido: safeDiv(g.recorrido, g.citas),
      pctUsables: safeDiv(g.usables, g.recorrido),
      pctAfluencia: safeDiv(g.afluencias, g.recorrido),
      pctMatriculas: safeDiv(g.matriculas, g.recorrido),
    };
  });

  const totalsCounts = resumenRows.reduce(
    (acc, r) => {
      acc.citas += r.citas;
      acc.recorrido += r.recorrido;
      acc.usables += r.usables;
      acc.afluencias += r.afluencias;
      acc.matriculas += r.matriculas;
      return acc;
    },
    { citas: 0, recorrido: 0, usables: 0, afluencias: 0, matriculas: 0 },
  );

  const totals: ResumenSemanalRow = {
    semana: "TOTALES",
    ...totalsCounts,
    pctRecorrido: safeDiv(totalsCounts.recorrido, totalsCounts.citas),
    pctUsables: safeDiv(totalsCounts.usables, totalsCounts.recorrido),
    pctAfluencia: safeDiv(totalsCounts.afluencias, totalsCounts.recorrido),
    pctMatriculas: safeDiv(totalsCounts.matriculas, totalsCounts.recorrido),
  };

  return { rows: resumenRows, totals, excluded };
}

export function runResumenSemanalSanityChecks(res: ResumenSemanalResult) {
  const sum = res.rows.reduce(
    (acc, r) => {
      acc.citas += r.citas;
      acc.recorrido += r.recorrido;
      acc.usables += r.usables;
      acc.afluencias += r.afluencias;
      acc.matriculas += r.matriculas;
      return acc;
    },
    { citas: 0, recorrido: 0, usables: 0, afluencias: 0, matriculas: 0 },
  );

  const ok =
    sum.citas === res.totals.citas &&
    sum.recorrido === res.totals.recorrido &&
    sum.usables === res.totals.usables &&
    sum.afluencias === res.totals.afluencias &&
    sum.matriculas === res.totals.matriculas;

  return {
    ok,
    message: ok
      ? "ResumenSemanal sanity OK"
      : `ResumenSemanal mismatch: sum=${JSON.stringify(sum)} totals=${JSON.stringify({
          citas: res.totals.citas,
          recorrido: res.totals.recorrido,
          usables: res.totals.usables,
          afluencias: res.totals.afluencias,
          matriculas: res.totals.matriculas,
        })}`,
  };
}
