"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Dataset } from "@/lib/data-processing/types";
import { reviveDataset } from "@/lib/persistence/dataset";

const MIN_REFRESH_INTERVAL_MS = 1_500;

type DiplomadoDataStore = {
  dataset: Dataset | null;
  setDataset: (ds: Dataset | null) => void;
};

// Simple module-level store (no Zustand dependency for diplomados)
let _dataset: Dataset | null = null;
const _listeners = new Set<() => void>();

function setGlobalDataset(ds: Dataset | null) {
  _dataset = ds;
  _listeners.forEach((fn) => fn());
}

export function useDataDiplomado() {
  const [dataset, setDataset] = useState<Dataset | null>(_dataset);
  const [hydrating, setHydrating] = useState(true);
  const datasetRef = useRef<Dataset | null>(dataset);
  const refreshInFlightRef = useRef<Promise<Dataset | null> | null>(null);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    datasetRef.current = dataset;
  }, [dataset]);

  // Sync with module-level store
  useEffect(() => {
    const listener = () => setDataset(_dataset);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const refreshDataset = useCallback(async () => {
    const now = Date.now();
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    if (now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) return datasetRef.current;

    const promise = (async () => {
      lastRefreshAtRef.current = Date.now();
      const res = await fetch("/api/snapshot-diplomado", { cache: "no-store" });
      if (res.status === 204) { setGlobalDataset(null); return null; }
      if (!res.ok) return null;
      const rawDs = (await res.json()) as Dataset;
      const ds = reviveDataset(rawDs);
      setGlobalDataset(ds);
      return ds;
    })();

    refreshInFlightRef.current = promise;
    try { return await promise; } finally { refreshInFlightRef.current = null; }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await refreshDataset(); } finally { if (alive) setHydrating(false); }
    })();
    return () => { alive = false; };
  }, [refreshDataset]);

  const replaceDataset = useCallback(async (next: Dataset) => {
    setGlobalDataset(next);
  }, []);

  const clearDataset = useCallback(async () => {
    setGlobalDataset(null);
  }, []);

  const meta = useMemo(() => dataset?.meta ?? null, [dataset]);

  return { dataset, meta, hydrating, refreshDataset, replaceDataset, clearDataset };
}
