import { create } from "zustand";
import { IntelligenceLevel } from "../design-system/tokens";

export type AppPage = "landing" | "fish" | "car" | "ailab" | "comparison" | "analytics";

interface AppState {
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;

  technicalMode: boolean;
  setTechnicalMode: (enabled: boolean) => void;
  toggleTechnicalMode: () => void;

  globalSeed: number;
  setGlobalSeed: (seed: number) => void;

  fishLevel: IntelligenceLevel;
  setFishLevel: (level: IntelligenceLevel) => void;

  carLevel: IntelligenceLevel;
  setCarLevel: (level: IntelligenceLevel) => void;

  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "landing",
  setCurrentPage: (page) => set({ currentPage: page }),

  technicalMode: false,
  setTechnicalMode: (enabled) => set({ technicalMode: enabled }),
  toggleTechnicalMode: () => set((state) => ({ technicalMode: !state.technicalMode })),

  globalSeed: 1337,
  setGlobalSeed: (seed) => set({ globalSeed: seed }),

  fishLevel: 0,
  setFishLevel: (level) => set({ fishLevel: level }),

  carLevel: 0,
  setCarLevel: (level) => set({ carLevel: level }),

  demoMode: false,
  setDemoMode: (enabled) => set({ demoMode: enabled }),
  toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
}));
