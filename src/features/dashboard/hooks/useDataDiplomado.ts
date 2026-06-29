"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Dataset } from "@/lib/data-processing/types";
import { reviveDataset } from "@/lib/persistence/dataset";
import { useDiplomadoStore } from "@/store/diplomado-store";

const MIN_REFRESH_INTERVAL_MS = 1_500;

export function useDataDiplomado() {
  const dataset = useDiplomadoStore((s) => s.dataset);
  const setDataset = useDiplomadoStore((s) => s.setDataset);
  const [hydrating, setHydrating] = useState(true);
  const datasetRef = useRef<Dataset | null>(dataset);
  const refreshInFlightRef = useRef<Promise<Dataset | null> | null>(null);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    datasetRef.current = dataset;
  }, [dataset]);

  const refreshDataset = useCallback(async () => {
    const now = Date.now();
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    if (now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) return datasetRef.current;

    const promise = (async () => {
      lastRefreshAtRef.current = Date.now();
      const res = await fetch("/api/snapshot-diplomado", { cache: "no-store" });
      if (res.status === 204) { setDataset(null); return null; }
      if (!res.ok) return null;
      const rawDs = (await res.json()) as Dataset;
      const ds = reviveDataset(rawDs);
      setDataset(ds);
      return ds;
    })();

    refreshInFlightRef.current = promise;
    try { return await promise; } finally { refreshInFlightRef.current = null; }
  }, [setDataset]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await refreshDataset(); } finally { if (alive) setHydrating(false); }
    })();
    return () => { alive = false; };
  }, [refreshDataset]);

  const replaceDataset = useCallback(async (next: Dataset) => { setDataset(next); }, [setDataset]);
  const clearDataset = useCallback(async () => { setDataset(null); }, [setDataset]);
  const meta = useMemo(() => dataset?.meta ?? null, [dataset]);

  return { dataset, meta, hydrating, refreshDataset, replaceDataset, clearDataset };
}
