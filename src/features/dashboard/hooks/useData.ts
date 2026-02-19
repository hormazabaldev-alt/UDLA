"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Dataset } from "@/lib/data-processing/types";
import {
  clearPersistedDataset,
  loadPersistedDataset,
  persistDataset,
} from "@/lib/persistence/dataset";
import { useDashboardStore } from "@/store/dashboard-store";

export function useData() {
  const dataset = useDashboardStore((s) => s.dataset);
  const setDataset = useDashboardStore((s) => s.setDataset);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const persisted = await loadPersistedDataset();
        if (!alive) return;
        if (persisted) setDataset(persisted);
      } finally {
        if (alive) setHydrating(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [setDataset]);

  const replaceDataset = useCallback(
    async (next: Dataset) => {
      setDataset(next);
      await persistDataset(next);
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
    replaceDataset,
    clearDataset,
  };
}

