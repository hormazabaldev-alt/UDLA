import { NextResponse } from "next/server";

import { parseXlsxFile } from "@/lib/data-processing/parse-xlsx";
import { applySnapshotUpdate, getActiveSnapshot } from "@/lib/supabase/snapshot";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dataset = await getActiveSnapshot();
    if (!dataset) return new NextResponse(null, { status: 204 });
    return NextResponse.json(dataset, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
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
    const files = form.getAll("file").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing file field(s)." },
        { status: 400 },
      );
    }

    const parsedResults = await Promise.all(files.map((f) => parseXlsxFile(f)));
    const firstInvalid = parsedResults.find((r) => !r.ok);
    if (firstInvalid && !firstInvalid.ok) {
      return NextResponse.json(firstInvalid, { status: 400 });
    }

    const datasets = parsedResults.map((r) => (r as Extract<typeof r, { ok: true }>).dataset);
    const mode = req.headers.get("x-upload-mode") === "append" ? "append" : "replace";
    const replaceBasesHeader = req.headers.get("x-replace-bases") ?? "";
    const replaceBases = replaceBasesHeader
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (mode === "replace" && replaceBases.length > 0) {
      const selected = new Set(replaceBases.map((b) => b.toLowerCase()));
      const found = new Set<string>();
      for (const d of datasets) {
        for (const r of d.rows) {
          const t = String(r.tipoBase ?? "").trim();
          if (t) found.add(t.toLowerCase());
        }
      }

      const foundArr = Array.from(found.values()).sort();
      const missing = replaceBases.filter((b) => !found.has(b.toLowerCase()));
      const extra = foundArr.filter((b) => !selected.has(b));

      if (missing.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `Reemplazo inválido: seleccionaste ${replaceBases.join(", ")} pero el/los archivo(s) no traen filas para ${missing.join(", ")}.`,
          },
          { status: 400 },
        );
      }

      if (extra.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: `Reemplazo inválido: el/los archivo(s) contienen Tipo Base adicional (${extra.join(", ")}). Selecciona esas bases también o usa Agregar.`,
          },
          { status: 400 },
        );
      }
    }

    const result = await applySnapshotUpdate({
      mode,
      datasets,
      fileNames: files.map((f) => f.name),
      replaceBases: mode === "replace" ? replaceBases : undefined,
    });

    return NextResponse.json(
      { ok: true, mode, meta: result.meta, totalRows: result.totalRows },
      { status: 200 },
    );
  } catch (e) {
    console.error("POST /api/snapshot error:", e);
    const message = e instanceof Error ? e.message : typeof e === "object" ? JSON.stringify(e) : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
