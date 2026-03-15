import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAtlasSignature } from "@/lib/atlas/auth";
import { computeTotals } from "@/lib/data-processing/metrics";
import { calcResumenSemanal } from "@/lib/metrics/resumen-semanal";
import { getActiveSnapshot } from "@/lib/supabase/snapshot";

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

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    verifyAtlasSignature({
      body: rawBody,
      signature: request.headers.get("x-atlas-signature"),
      timestamp: request.headers.get("x-atlas-timestamp"),
    });

    requestSchema.parse(JSON.parse(rawBody));
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
