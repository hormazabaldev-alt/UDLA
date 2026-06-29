import { create } from "zustand";
import type { Dataset } from "@/lib/data-processing/types";

type DiplomadoState = {
  dataset: Dataset | null;
  setDataset: (dataset: Dataset | null) => void;
};

export const useDiplomadoStore = create<DiplomadoState>((set) => ({
  dataset: null,
  setDataset: (dataset) => set({ dataset }),
}));
