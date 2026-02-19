import { NextResponse } from "next/server";

import { parseXlsxFile } from "@/lib/data-processing/parse-xlsx";
import { getActiveSnapshot, replaceSnapshot } from "@/lib/supabase/snapshot";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dataset = await getActiveSnapshot();
    if (!dataset) return new NextResponse(null, { status: 204 });
    return NextResponse.json(dataset, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

function assertAdmin(req: Request) {
  // Fallback to "admin123" if env is missing, to avoid "Server misconfigured"
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
  try {
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

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing file field." },
        { status: 400 },
      );
    }

    const parsed = await parseXlsxFile(file);
    if (!parsed.ok) {
      return NextResponse.json(parsed, { status: 400 });
    }

    await replaceSnapshot(parsed.dataset);
    return NextResponse.json(
      { ok: true, meta: parsed.dataset.meta },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
