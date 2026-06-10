import { liscaLocalStorage } from "@lisca/storage";
import { createContext, useContext, useState, type ReactNode } from "react";
import { shellThemeColors, type ShellThemeColors, type ShellThemeMode } from "./tokens.ts";
type ShellThemeContextValue = {
  mode: ShellThemeMode;
  setMode: (mode: ShellThemeMode) => void;
  resolvedTheme: ShellThemeMode;
  colors: ShellThemeColors;
  toggleLightDark: () => void;
};
const ShellThemeContext = createContext<ShellThemeContextValue | null>(null);
const DEFAULT_STORAGE_KEY = "lisca-shell-theme";
function readStoredMode(storageKey: string, fallback: ShellThemeMode): ShellThemeMode {
  const raw = liscaLocalStorage().getItem(storageKey);
  if (raw === "light" || raw === "dark") return raw;
  return fallback;
}
export function ShellThemeProvider(props: {
  children: ReactNode;
  defaultMode?: ShellThemeMode;
  storageKey?: string;
}) {
  const defaultMode = props.defaultMode ?? "light";
  const storageKey = props.storageKey ?? DEFAULT_STORAGE_KEY;
  const [mode, setModeState] = useState<ShellThemeMode>(() =>
    readStoredMode(storageKey, defaultMode),
  );
  const setMode = (next: ShellThemeMode) => {
    setModeState(next);
    liscaLocalStorage().setItem(storageKey, next);
  };
  const resolvedTheme = mode;
  const toggleLightDark = () => {
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  };
  const value = {
    mode,
    setMode,
    resolvedTheme,
    colors: shellThemeColors[resolvedTheme],
    toggleLightDark,
  };
  return <ShellThemeContext.Provider value={value}>{props.children}</ShellThemeContext.Provider>;
}
export function useShellTheme(): ShellThemeContextValue {
  const ctx = useContext(ShellThemeContext);
  if (!ctx) throw new Error("useShellTheme must be used within ShellThemeProvider");
  return ctx;
}
