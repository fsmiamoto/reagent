import { create } from "zustand";

export type ViewMode = "unified" | "split";

interface SettingsStore {
  defaultViewMode: ViewMode;
  setDefaultViewMode: (mode: ViewMode) => void;
}

const STORAGE_KEY = "reagent.diffViewMode";

const getStoredViewMode = (): ViewMode => {
  if (typeof window === "undefined") return "unified";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "unified" || stored === "split") {
    return stored;
  }
  return "unified";
};

const persistViewMode = (mode: ViewMode) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    console.warn("Failed to persist diff view mode preference", error);
  }
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  defaultViewMode: getStoredViewMode(),
  setDefaultViewMode: (mode) => {
    persistViewMode(mode);
    set({ defaultViewMode: mode });
  },
}));
