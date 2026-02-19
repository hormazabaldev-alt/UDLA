import { NextResponse } from "next/server";
import { getUploadLogs } from "@/lib/supabase/snapshot";

export const runtime = "nodejs";

export async function GET() {
    try {
        const logs = await getUploadLogs();
        return NextResponse.json(logs, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 },
        );
    }
}
