import { safeStorage } from '@edith/core';
import { create } from 'zustand';

export type Theme = 'light' | 'link' | 'dark';

const THEME_KEY = 'edith:theme';
const THEMES: Theme[] = ['light', 'link', 'dark'];

function readStoredTheme(): Theme {
  const stored = safeStorage.getItem(THEME_KEY);
  return (THEMES as string[]).includes(stored ?? '') ? (stored as Theme) : 'light';
}

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Applies only to Edith's own UI — the Preview iframe is never themed by
// Edith, its appearance comes solely from the page's own code (spec §37).
export const useThemeStore = create<ThemeStore>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    safeStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
}));
