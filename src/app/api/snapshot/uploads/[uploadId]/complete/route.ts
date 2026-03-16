import { NextResponse } from "next/server";

import { importDatasetSnapshot, type ImportProgressEvent } from "@/lib/data-processing/import-dataset-server";
import { assembleTempUploadFile, cleanupTempUpload } from "@/lib/supabase/snapshot";
import { assertDashboardAdmin } from "@/lib/server/dashboard-admin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: Request,
  context: { params: Promise<{ uploadId: string }> },
) {
  const auth = assertDashboardAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      let uploadId = "";
      try {
        const params = await context.params;
        uploadId = params.uploadId;
        const body = (await req.json()) as { fileName?: string; totalChunks?: number; append?: boolean } | null;
        const fileName = body?.fileName?.trim();
        const totalChunks = Number(body?.totalChunks);
        const append = Boolean(body?.append);

        if (!fileName || !Number.isInteger(totalChunks) || totalChunks <= 0) {
          send({ type: "fatal_error", error: "Parametros de carga incompletos." });
          return;
        }

        const file = await assembleTempUploadFile(uploadId, fileName, totalChunks);
        const result = await importDatasetSnapshot(file, async (event: ImportProgressEvent) => {
          send({ type: "progress", ...event });
        }, { append });

        if (!result.ok) {
          send({ type: "validation_error", issues: result.issues, preview: result.preview });
          return;
        }

        send({
          type: "completed",
          ok: true,
          mode: "replace",
          meta: result.meta,
          totalRows: result.meta.rowCount,
        });
      } catch (error) {
        console.error("POST /api/snapshot/uploads/[uploadId]/complete error:", error);
        const message =
          error instanceof Error ? error.message : typeof error === "object" ? JSON.stringify(error) : "Unknown error";
        send({ type: "fatal_error", error: message });
      } finally {
        if (uploadId) {
          await cleanupTempUpload(uploadId);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
