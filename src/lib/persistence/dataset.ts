import { get, set, del } from "idb-keyval";

import type { Dataset } from "@/lib/data-processing/types";

const KEY = "powerbi-web:dataset:v1";

export function reviveDataset(ds: Dataset): Dataset {
  if (!ds || !ds.rows) return ds;
  for (const r of ds.rows) {
    if (typeof r.fechaCarga === "string") r.fechaCarga = new Date(r.fechaCarga);
    if (typeof r.fechaGestion === "string") r.fechaGestion = new Date(r.fechaGestion);
    if (typeof r.fechaAf === "string") r.fechaAf = new Date(r.fechaAf);
    if (typeof r.fechaMc === "string") r.fechaMc = new Date(r.fechaMc);
  }
  return ds;
}

export async function loadPersistedDataset(): Promise<Dataset | null> {
  const value = await get(KEY);
  if (!value) return null;
  return reviveDataset(value as Dataset);
}

export async function persistDataset(dataset: Dataset): Promise<void> {
  await set(KEY, dataset);
}

export async function clearPersistedDataset(): Promise<void> {
  await del(KEY);
}

