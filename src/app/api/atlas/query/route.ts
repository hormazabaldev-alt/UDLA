import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAtlasSignature } from "@/lib/atlas/auth";
import { computeTotals } from "@/lib/data-processing/metrics";
import { calcResumenSemanal } from "@/lib/metrics/resumen-semanal";
import { getActiveSnapshot } from "@/lib/supabase/snapshot";
import { getMetricDate, type MetricKey } from "@/lib/data-processing/temporal";
import type { DataRow } from "@/lib/data-processing/types";

export const runtime = "nodejs";

const requestSchema = z.object({
  actor: z.object({
    enabled: z.boolean(),
    actorId: z.string().trim().min(1).optional(),
    displayName: z.string().trim().min(1).optional(),
  }),
  capability: z.literal("dashboard_summary"),
  query: z.string().trim().default(""),
  parameters: z.record(z.string(), z.unknown()).default({}),
  context: z.object({
    requestId: z.string().trim().min(1),
    sessionId: z.string().trim().min(1),
    locale: z.string().trim().min(1),
  }),
});

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function fmtPct(value: number | null) {
  return value === null ? "n/d" : `${(value * 100).toFixed(1)}%`;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function detectMonth(text: string) {
  const normalized = normalize(text);
  const months: Array<[number, RegExp]> = [
    [1, /\benero\b/],
    [2, /\bfebrero\b/],
    [3, /\bmarzo\b/],
    [4, /\babril\b/],
    [5, /\bmayo\b/],
    [6, /\bjunio\b/],
    [7, /\bjulio\b/],
    [8, /\bagosto\b/],
    [9, /\bseptiembre\b/],
    [10, /\boctubre\b/],
    [11, /\bnoviembre\b/],
    [12, /\bdiciembre\b/],
  ];

  return months.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

function detectYear(text: string) {
  const normalized = normalize(text);
  const explicitYear = normalized.match(/\b(20\d{2})\b/);
  if (explicitYear) {
    return Number(explicitYear[1]);
  }
  if (/\beste año\b/.test(normalized)) {
    return new Date().getFullYear();
  }
  return null;
}

function detectMetric(text: string): { key: MetricKey | "recorrido"; label: string } | null {
  const normalized = normalize(text);
  if (/matricul/.test(normalized)) return { key: "mc", label: "matrículas" };
  if (/afluenc/.test(normalized)) return { key: "af", label: "afluencias" };
  if (/citas?/.test(normalized)) return { key: "citas", label: "citas" };
  if (/contactabilidad|contactados?/.test(normalized)) return { key: "contactado", label: "contactados" };
  if (/registros?.*(gestion|gestionaron|gestionados)|gestionados?|gestionaron|recorrid/.test(normalized)) {
    return { key: "recorrido", label: "registros gestionados" };
  }
  if (/base|cargad/.test(normalized)) return { key: "cargada", label: "registros base" };
  return null;
}

function detectBoardReference(text: string, dataset: Awaited<ReturnType<typeof getActiveSnapshot>>) {
  if (!dataset) return null;
  const normalized = normalize(text);
  const source = normalize(dataset.meta.sourceFileName);
  const sheet = normalize(dataset.meta.sheetName);
  if (!normalized) return null;
  const tokens = normalized.split(/\s+/).filter((token) => token.length >= 4);
  const matched = tokens.find((token) => source.includes(token) || sheet.includes(token));
  return matched ?? null;
}

function filterRowsByPeriod(rows: DataRow[], metric: MetricKey | "recorrido", month: number | null, year: number | null) {
  if (!month && !year) {
    return rows;
  }

  return rows.filter((row) => {
    const date =
      metric === "recorrido"
        ? getMetricDate(row, "recorrido")
        : getMetricDate(row, metric);

    if (!date) return false;
    if (month && date.getMonth() + 1 !== month) return false;
    if (year && date.getFullYear() !== year) return false;
    return true;
  });
}

function extractMetricValue(metric: MetricKey | "recorrido", totals: ReturnType<typeof computeTotals>) {
  if (metric === "recorrido") return totals.recorrido;
  return totals[metric];
}

function buildFocusedAnswer(query: string, dataset: NonNullable<Awaited<ReturnType<typeof getActiveSnapshot>>>) {
  const month = detectMonth(query);
  const year = detectYear(query);
  const metric = detectMetric(query);

  if (!month && !year && !metric) {
    return null;
  }

  const boardToken = detectBoardReference(query, dataset);
  const filteredRows = filterRowsByPeriod(dataset.rows, metric?.key ?? "recorrido", month, year);
  const totals = computeTotals(filteredRows);
  const value = extractMetricValue(metric?.key ?? "recorrido", totals);

  const periodLabel = [
    month
      ? new Intl.DateTimeFormat("es-CL", { month: "long" }).format(new Date(2026, month - 1, 1))
      : null,
    year ? String(year) : null,
  ].filter(Boolean).join(" de ");

  return {
    summary: `${metric?.label ?? "Registros gestionados"}: ${value}.`,
    highlights: [
      boardToken
        ? `Referencia detectada: ${boardToken} sobre ${dataset.meta.sheetName}.`
        : `Snapshot activo: ${dataset.meta.sheetName}.`,
      periodLabel ? `Periodo consultado: ${periodLabel}.` : "Periodo consultado: snapshot activo.",
      `Filas analizadas: ${filteredRows.length}.`,
    ],
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    verifyAtlasSignature({
      body: rawBody,
      signature: request.headers.get("x-atlas-signature"),
      timestamp: request.headers.get("x-atlas-timestamp"),
    });

    const parsed = requestSchema.parse(JSON.parse(rawBody));
    const dataset = await getActiveSnapshot();
    if (!dataset) {
      return json({
        ok: true,
        product: "powerbi-web",
        capability: "dashboard_summary",
        title: "PowerBI Web",
        summary: "No hay snapshot cargado todavía.",
        highlights: ["Carga un archivo para habilitar KPIs ejecutivos."],
        data: null,
      });
    }

    const focused = buildFocusedAnswer(parsed.query, dataset);
    if (focused) {
      return json({
        ok: true,
        product: "powerbi-web",
        capability: "dashboard_summary",
        title: "PowerBI Web",
        summary: focused.summary,
        highlights: focused.highlights,
        data: {
          meta: dataset.meta,
        },
      });
    }

    const totals = computeTotals(dataset.rows);
    const weekly = calcResumenSemanal(dataset.rows);
    const latestWeek = weekly.rows.at(-1) ?? null;
    const previousWeek = weekly.rows.at(-2) ?? null;

    const variation =
      latestWeek && previousWeek
        ? {
            citas: latestWeek.citas - previousWeek.citas,
            afluencias: latestWeek.afluencias - previousWeek.afluencias,
            matriculas: latestWeek.matriculas - previousWeek.matriculas,
          }
        : null;

    const highlights = [
      `Snapshot: ${dataset.meta.sourceFileName} · ${dataset.meta.sheetName} · ${dataset.meta.rowCount} filas`,
      `Base cargada: ${totals.cargada}`,
      `Contactado: ${totals.contactado} (${fmtPct(totals.pctContactabilidad)})`,
      `Citas: ${totals.citas}`,
      `Afluencias: ${totals.af} (${fmtPct(totals.tcAf)})`,
      `Matrículas: ${totals.mc} (${fmtPct(totals.tcMc)})`,
      `Efectividad: ${fmtPct(totals.pctEfectividad)}`,
    ];

    if (latestWeek) {
      highlights.push(
        `Semana más reciente ${latestWeek.semana}: ${latestWeek.citas} citas, ${latestWeek.afluencias} afluencias y ${latestWeek.matriculas} matrículas`,
      );
    }

    if (variation) {
      highlights.push(
        `Variación semanal: citas ${variation.citas >= 0 ? "+" : ""}${variation.citas}, afluencias ${variation.afluencias >= 0 ? "+" : ""}${variation.afluencias}, matrículas ${variation.matriculas >= 0 ? "+" : ""}${variation.matriculas}`,
      );
    }

    return json({
      ok: true,
      product: "powerbi-web",
      capability: "dashboard_summary",
      title: "PowerBI Web",
      summary: `KPIs del snapshot activo: ${totals.cargada} registros base, ${totals.citas} citas, ${totals.af} afluencias y ${totals.mc} matrículas.`,
      highlights,
      suggestions: [
        "Pide explicación de variaciones o comparativos por semana",
        "Consulta afluencia, matrículas o contactabilidad de forma puntual",
      ],
      data: {
        meta: dataset.meta,
        totals,
        latestWeek,
        previousWeek,
      },
    });
  } catch (error) {
    console.error("[api/atlas/query] powerbi-web error", error);
    return json(
      {
        ok: false,
        product: "powerbi-web",
        capability: "dashboard_summary",
        title: "PowerBI Web",
        summary: "No se pudo resolver la consulta analítica.",
        highlights: [],
        error: error instanceof Error ? error.message : "Error interno",
      },
      500,
    );
  }
}
