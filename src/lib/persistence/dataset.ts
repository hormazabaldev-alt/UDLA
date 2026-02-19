import { get, set, del } from "idb-keyval";

import type { Dataset } from "@/lib/data-processing/types";

const KEY = "powerbi-web:dataset:v1";

export async function loadPersistedDataset(): Promise<Dataset | null> {
  const value = await get(KEY);
  return (value as Dataset | undefined) ?? null;
}

export async function persistDataset(dataset: Dataset): Promise<void> {
  await set(KEY, dataset);
}

export async function clearPersistedDataset(): Promise<void> {
  await del(KEY);
}

