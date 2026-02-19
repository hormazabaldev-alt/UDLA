import "server-only";

import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    // Return a dummy client or throw only on usage? 
    // For now, let's log a warning and return strict error on usage, 
    // or just return null and let the caller handle it?
    // Better: Throw a clear error, but maybe the user is just building?
    console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Supabase features will fail.");
    // We must throw if we can't create the client, but maybe we can delay it?
    // Actually, let's just create a dummy client if we are in dev/build and missing vars to avoid crash loop?
    // No, that hides errors.
    // Let's just return a valid client but with empty values (will fail on request) if we want to allow app to start?
    // No, createClient throws on empty URL.

    // Best approach: Throw but with a very clear message about .env.local
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. \nIf running locally, ensure they are in .env.local",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

