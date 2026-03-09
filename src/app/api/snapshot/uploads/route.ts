import { NextResponse } from "next/server";

import { beginTempUpload } from "@/lib/supabase/snapshot";
import { assertDashboardAdmin } from "@/lib/server/dashboard-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = assertDashboardAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.message },
      { status: auth.status },
    );
  }

  try {
    const body = (await req.json()) as { fileName?: string } | null;
    const fileName = body?.fileName?.trim();

    if (!fileName) {
      return NextResponse.json(
        { ok: false, error: "Falta el nombre del archivo." },
        { status: 400 },
      );
    }

    const upload = await beginTempUpload(fileName);
    return NextResponse.json({ ok: true, ...upload });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
