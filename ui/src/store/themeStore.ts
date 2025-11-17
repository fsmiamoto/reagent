import { create } from 'zustand';

export type ThemeName = 'dark' | 'light';

interface ThemeStore {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'reagent.theme';

const getPreferredTheme = (): ThemeName => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

const persistTheme = (theme: ThemeName) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to persist theme preference', error);
  }
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getPreferredTheme(),
  setTheme: (theme) => {
    persistTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      persistTheme(nextTheme);
      return { theme: nextTheme };
    });
  },
}));
