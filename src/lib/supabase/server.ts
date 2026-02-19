import "server-only";

import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY; // Fallback to secret key if service role missing

  if (!url || !serviceRoleKey) {
    console.error("❌ Supabase Config Error:", {
      hasUrl: !!url,
      hasServiceRoleKey: !!serviceRoleKey,
      envKeys: Object.keys(process.env).filter(k => k.includes("SUPABASE"))
    });

    throw new Error(
      `Missing Env Vars. URL: ${!!url}, Key: ${!!serviceRoleKey}. Check Vercel Logs.`
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

