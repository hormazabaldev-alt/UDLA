import { NextResponse } from "next/server";

import { importXlsxSnapshot, type ImportProgressEvent } from "@/lib/data-processing/import-xlsx-server";
import { getActiveSnapshot } from "@/lib/supabase/snapshot";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dataset = await getActiveSnapshot();
    if (!dataset) return new NextResponse(null, { status: 204 });
    return NextResponse.json(dataset, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

function assertAdmin(req: Request) {
  const expected = process.env.DASHBOARD_ADMIN_KEY || "admin123";
  if (!expected) {
    return { ok: false as const, status: 500, message: "Server misconfigured." };
  }
  const got = req.headers.get("x-admin-key");
  if (!got || got !== expected) {
    return { ok: false as const, status: 401, message: "Unauthorized." };
  }
  return { ok: true as const };
}

export async function POST(req: Request) {
  const auth = assertAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, error: "Expected multipart/form-data with a file field." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        const form = await req.formData();
        const files = form.getAll("file").filter((file): file is File => file instanceof File);
        if (files.length !== 1) {
          send({ type: "fatal_error", error: "Debes subir exactamente 1 archivo XLSX." });
          return;
        }

        const file = files[0]!;
        const result = await importXlsxSnapshot(file, async (event: ImportProgressEvent) => {
          send({ type: "progress", ...event });
        });

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
        console.error("POST /api/snapshot error:", error);
        const message =
          error instanceof Error ? error.message : typeof error === "object" ? JSON.stringify(error) : "Unknown error";
        send({ type: "fatal_error", error: message });
      } finally {
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
