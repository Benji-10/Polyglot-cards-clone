"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { THEME_PRESETS, getTheme } from "@/lib/constants";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

// ---- Theme context ----
interface ThemeContextValue {
  settings: AppSettings;
  setSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  applyTheme: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppSettings(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppSettings must be used within Providers");
  return ctx;
}

function applyThemeVars(themeName: string) {
  const theme = getTheme(themeName);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
  root.setAttribute("data-theme", themeName);
  root.classList.toggle("dark", theme.dark);
  root.style.colorScheme = theme.dark ? "dark" : "light";
}

const SETTINGS_KEY = "polyglot_settings";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            networkMode: "offlineFirst",
          },
          mutations: { networkMode: "offlineFirst" },
        },
      })
  );

  const [settings, setSettingsState] = useState<AppSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return DEFAULT_SETTINGS;
  });

  // Apply theme variables to the DOM whenever the theme changes (DOM-only side effect).
  useEffect(() => {
    applyThemeVars(settings.theme);
  }, [settings.theme]);

  const setSettings = useCallback(
    (next: AppSettings | ((p: AppSettings) => AppSettings)) => {
      setSettingsState((prev) => {
        const val =
          typeof next === "function" ? (next as (p: AppSettings) => AppSettings)(prev) : next;
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(val));
        } catch {
          /* ignore */
        }
        applyThemeVars(val.theme);
        return val;
      });
    },
    []
  );

  const applyTheme = useCallback(
    (name: string) => {
      setSettings((p) => ({ ...p, theme: name, customTheme: {} }));
    },
    [setSettings]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ settings, setSettings, applyTheme }}>
        {children}
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}

// Re-export for convenience
export { THEME_PRESETS };
