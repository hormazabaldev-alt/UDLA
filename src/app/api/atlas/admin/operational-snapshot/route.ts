import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAtlasSignature } from "@/lib/atlas/auth";
import { computeTotals } from "@/lib/data-processing/metrics";
import { calcResumenSemanal } from "@/lib/metrics/resumen-semanal";
import { getActiveSnapshot } from "@/lib/supabase/snapshot";

export const runtime = "nodejs";

const requestSchema = z.object({
  source: z.string().trim().optional(),
  requestedAt: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  locale: z.string().trim().optional(),
});

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function metricRow(args: {
  metricKey: string;
  metricLabel: string;
  metricValue: unknown;
  valueLabel: string;
  importedAt: string;
  boardName: string;
  periodDate: string;
}) {
  return {
    board_key: "executive-kpis",
    board_name: args.boardName,
    metric_key: args.metricKey,
    metric_label: args.metricLabel,
    period_date: args.periodDate,
    interval_kind: "snapshot",
    interval_label: "active_snapshot",
    interval_start: args.importedAt,
    interval_end: args.importedAt,
    metric_value: args.metricValue,
    value_label: args.valueLabel,
    payload: {},
  };
}

function formatPercent(value: number | null) {
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
        source: "powerbi-web",
        snapshot: {
          aliases: [
            {
              alias: "powerbi",
              entity_type: "product",
              entity_id: "powerbi-web",
              entity_label: "PowerBI",
              metadata: { source: "powerbi-web" },
              priority: 1,
              is_active: true,
              locale: "es-BO",
              audiences: ["ops", "executive"],
              notes: "Alias corto principal.",
            },
          ],
          latestSnapshots: [],
          powerBiSummaries: [],
        },
      });
    }

    const totals = computeTotals(dataset.rows);
    const weekly = calcResumenSemanal(dataset.rows);
    const latestWeek = weekly.rows.at(-1) ?? null;
    const previousWeek = weekly.rows.at(-2) ?? null;
    const importedAt = dataset.meta.importedAtISO;
    const periodDate = importedAt.slice(0, 10);
    const boardName = `PowerBI ${dataset.meta.sheetName}`;

    const aliases = [
      {
        alias: "powerbi",
        entity_type: "product",
        entity_id: "powerbi-web",
        entity_label: "PowerBI",
        metadata: { source: "powerbi-web" },
        priority: 1,
        is_active: true,
        locale: "es-BO",
        audiences: ["ops", "executive"],
        notes: "Alias corto principal.",
      },
      {
        alias: "dashboard",
        entity_type: "product",
        entity_id: "powerbi-web",
        entity_label: "PowerBI",
        metadata: { source: "powerbi-web" },
        priority: 2,
        is_active: true,
        locale: "es-BO",
        audiences: ["ops", "executive"],
        notes: "Alias funcional para tablero ejecutivo.",
      },
      ...[
        ["kpis", "Indicadores"],
        ["indicadores", "Indicadores"],
        ["matriculas", "Matrículas"],
        ["afluencia", "Afluencia"],
        ["contactabilidad", "Contactabilidad"],
        ["citas", "Citas"],
      ].map(([alias, label], index) => ({
        alias,
        entity_type: "metric",
        entity_id: alias,
        entity_label: label,
        metadata: { product: "powerbi-web" },
        priority: 20 + index,
        is_active: true,
        locale: "es-BO",
        audiences: ["ops", "executive"],
        notes: "Métrica derivada del snapshot activo.",
      })),
    ];

    const powerBiSummaries = [
      metricRow({
        metricKey: "base_cargada",
        metricLabel: "Base cargada",
        metricValue: totals.cargada,
        valueLabel: String(totals.cargada),
        importedAt,
        boardName,
        periodDate,
      }),
      metricRow({
        metricKey: "contactado",
        metricLabel: "Contactado",
        metricValue: totals.contactado,
        valueLabel: String(totals.contactado),
        importedAt,
        boardName,
        periodDate,
      }),
      metricRow({
        metricKey: "citas",
        metricLabel: "Citas",
        metricValue: totals.citas,
        valueLabel: String(totals.citas),
        importedAt,
        boardName,
        periodDate,
      }),
      metricRow({
        metricKey: "afluencias",
        metricLabel: "Afluencias",
        metricValue: totals.af,
        valueLabel: String(totals.af),
        importedAt,
        boardName,
        periodDate,
      }),
      metricRow({
        metricKey: "matriculas",
        metricLabel: "Matrículas",
        metricValue: totals.mc,
        valueLabel: String(totals.mc),
        importedAt,
        boardName,
        periodDate,
      }),
      metricRow({
        metricKey: "contactabilidad",
        metricLabel: "Contactabilidad",
        metricValue: totals.pctContactabilidad,
        valueLabel: formatPercent(totals.pctContactabilidad),
        importedAt,
        boardName,
        periodDate,
      }),
      metricRow({
        metricKey: "efectividad",
        metricLabel: "Efectividad",
        metricValue: totals.pctEfectividad,
        valueLabel: formatPercent(totals.pctEfectividad),
        importedAt,
        boardName,
        periodDate,
      }),
      ...(latestWeek
        ? [
            {
              board_key: "weekly-summary",
              board_name: "Resumen semanal",
              metric_key: "latest_week_citas",
              metric_label: `Citas semana ${latestWeek.semana}`,
              period_date: periodDate,
              interval_kind: "week",
              interval_label: String(latestWeek.semana),
              interval_start: importedAt,
              interval_end: importedAt,
              metric_value: latestWeek.citas,
              value_label: String(latestWeek.citas),
              payload: {
                afluencias: latestWeek.afluencias,
                matriculas: latestWeek.matriculas,
                previousWeek: previousWeek ?? null,
              },
            },
          ]
        : []),
    ];

    const latestSnapshots = [
      {
        id: `powerbi-web:global:${importedAt}`,
        product: "powerbi-web",
        scope_type: "global",
        scope_id: "powerbi-web",
        scope_label: boardName,
        date_local: periodDate,
        interval_label: "active_snapshot",
        interval_start: importedAt,
        interval_end: importedAt,
        payload: {
          meta: dataset.meta,
          totals,
          latestWeek,
          previousWeek,
        },
      },
    ];

    return json({
      ok: true,
      source: "powerbi-web",
      snapshot: {
        aliases,
        latestSnapshots,
        powerBiSummaries,
      },
    });
  } catch (error) {
    console.error("[api/atlas/admin/operational-snapshot] powerbi-web error", error);
    return json(
      {
        ok: false,
        source: "powerbi-web",
        error: error instanceof Error ? error.message : "Error interno",
      },
      500,
    );
  }
}
