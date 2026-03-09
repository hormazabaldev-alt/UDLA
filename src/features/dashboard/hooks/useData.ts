"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Dataset } from "@/lib/data-processing/types";
import {
  clearPersistedDataset,
  loadPersistedDataset,
  persistDataset,
  reviveDataset,
} from "@/lib/persistence/dataset";
import { subscribeDatasetUpdates } from "@/lib/persistence/dataset-sync";
import { useDashboardStore } from "@/store/dashboard-store";

const MAX_PERSISTED_ROWS = 100_000;
const MIN_REFRESH_INTERVAL_MS = 1_500;

export function useData() {
  const dataset = useDashboardStore((s) => s.dataset);
  const setDataset = useDashboardStore((s) => s.setDataset);
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
    if (now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) {
      return datasetRef.current;
    }

    const refreshPromise = (async () => {
      lastRefreshAtRef.current = Date.now();

      const res = await fetch("/api/snapshot", { cache: "no-store" });
      if (res.status === 204) {
        setDataset(null);
        await clearPersistedDataset();
        return null;
      }
      if (!res.ok) {
        return null;
      }
      const rawDs = (await res.json()) as Dataset;
      const ds = reviveDataset(rawDs);
      setDataset(ds);
      if (ds.meta.rowCount <= MAX_PERSISTED_ROWS) {
        await persistDataset(ds);
      } else {
        await clearPersistedDataset();
      }
      return ds;
    })();

    refreshInFlightRef.current = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [setDataset]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "hidden") return;
      void refreshDataset();
    };

    const unsubscribe = subscribeDatasetUpdates(() => {
      void refreshDataset();
    });

    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [refreshDataset]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const persisted = await loadPersistedDataset();
        if (!alive) return;
        if (persisted) setDataset(persisted);
        await refreshDataset();
      } finally {
        if (alive) setHydrating(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshDataset, setDataset]);

  const replaceDataset = useCallback(
    async (next: Dataset) => {
      setDataset(next);
      if (next.meta.rowCount <= MAX_PERSISTED_ROWS) {
        await persistDataset(next);
      } else {
        await clearPersistedDataset();
      }
    },
    [setDataset],
  );

  const clearDataset = useCallback(async () => {
    setDataset(null);
    await clearPersistedDataset();
  }, [setDataset]);

  const meta = useMemo(() => dataset?.meta ?? null, [dataset]);

  return {
    dataset,
    meta,
    hydrating,
    refreshDataset,
    replaceDataset,
    clearDataset,
  };
}
