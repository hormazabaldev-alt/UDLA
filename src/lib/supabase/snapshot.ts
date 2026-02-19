import "server-only";

import type { Dataset, DatasetMeta, DataRow } from "@/lib/data-processing/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Simple snapshot persistence using Supabase Storage.
 * We store the entire dataset as a single JSON file in a bucket.
 * This preserves ALL raw row data (conecta, interesa, af, mc, etc.)
 * so KPI calculations work correctly when loading from DB.
 */

const BUCKET = "snapshots";
const FILE_PATH = "active/dataset.json";

async function ensureBucket(supabase: ReturnType<typeof getSupabaseServerClient>) {
  // Try to create the bucket (will fail silently if it exists)
  await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 52428800, // 50MB
  });
}

export async function getActiveSnapshot(): Promise<Dataset | null> {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(FILE_PATH);

    if (error) {
      // File doesn't exist yet = no snapshot
      console.warn("No active snapshot found:", error.message);
      return null;
    }

    const text = await data.text();
    const dataset: Dataset = JSON.parse(text);
    return dataset;
  } catch (err) {
    console.warn("getActiveSnapshot failed:", err);
    return null;
  }
}

export async function replaceSnapshot(dataset: Dataset): Promise<{ meta: DatasetMeta }> {
  const supabase = getSupabaseServerClient();

  await ensureBucket(supabase);

  const json = JSON.stringify(dataset);
  const blob = new Blob([json], { type: "application/json" });

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(FILE_PATH, blob, {
      upsert: true,
      contentType: "application/json",
    });

  if (error) {
    console.error("Failed to upload snapshot:", error);
    throw new Error(`Failed to save snapshot: ${error.message}`);
  }

  return { meta: dataset.meta };
}
