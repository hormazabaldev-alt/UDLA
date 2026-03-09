import { NextResponse } from "next/server";

import { cleanupTempUpload, storeTempUploadChunk } from "@/lib/supabase/snapshot";
import { assertDashboardAdmin } from "@/lib/server/dashboard-admin";

export const runtime = "nodejs";

export async function PUT(
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

  try {
    const { uploadId } = await context.params;
    const partNumberParam = new URL(req.url).searchParams.get("partNumber");
    const partNumber = Number(partNumberParam);

    if (!Number.isInteger(partNumber) || partNumber < 0) {
      return NextResponse.json(
        { ok: false, error: "partNumber invalido." },
        { status: 400 },
      );
    }

    const buffer = await req.arrayBuffer();
    if (buffer.byteLength === 0) {
      return NextResponse.json(
        { ok: false, error: "El bloque viene vacio." },
        { status: 400 },
      );
    }

    await storeTempUploadChunk(uploadId, partNumber, new Uint8Array(buffer));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

  try {
    const { uploadId } = await context.params;
    await cleanupTempUpload(uploadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
