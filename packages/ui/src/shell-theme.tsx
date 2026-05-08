import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ShellThemeMode = "light" | "dark";

type ShellThemeContextValue = {
  mode: ShellThemeMode;
  setMode: (mode: ShellThemeMode) => void;
  /** Same as `mode` (kept for callers that branch on a resolved light/dark value). */
  resolvedTheme: ShellThemeMode;
  toggleLightDark: () => void;
};

const ShellThemeContext = createContext<ShellThemeContextValue | null>(null);

const DEFAULT_STORAGE_KEY = "lisca-shell-theme";

function readStoredMode(storageKey: string, fallback: ShellThemeMode): ShellThemeMode {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === "light" || raw === "dark") return raw;
    if (raw === "system") return fallback;
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Persists light/dark choice and syncs `document.documentElement` (`class="dark"` and
 * `color-scheme`) so Tailwind `dark:` utilities apply app-wide.
 */
export function ShellThemeProvider(props: {
  children: ReactNode;
  /** Used when nothing valid is in `localStorage`. */
  defaultMode?: ShellThemeMode;
  /** `localStorage` key for the mode string. */
  storageKey?: string;
}) {
  const defaultMode = props.defaultMode ?? "light";
  const storageKey = props.storageKey ?? DEFAULT_STORAGE_KEY;

  const [mode, setModeState] = useState<ShellThemeMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    return readStoredMode(storageKey, defaultMode);
  });

  const setMode = useCallback(
    (next: ShellThemeMode) => {
      setModeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const resolvedTheme = mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
  }, [resolvedTheme]);

  const toggleLightDark = useCallback(() => {
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setMode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      resolvedTheme,
      toggleLightDark,
    }),
    [mode, resolvedTheme, setMode, toggleLightDark],
  );

  return <ShellThemeContext.Provider value={value}>{props.children}</ShellThemeContext.Provider>;
}

export function useShellTheme(): ShellThemeContextValue {
  const ctx = useContext(ShellThemeContext);
  if (!ctx) {
    throw new Error("useShellTheme must be used within ShellThemeProvider");
  }
  return ctx;
}

const themeToggleTextClass =
  "cursor-pointer border-0 bg-transparent p-0 font-inherit text-inherit text-xs underline underline-offset-2 opacity-80 hover:opacity-100";

/**
 * Single underlined label in the top bar corner: shows **dark** while in light mode
 * (click → dark), **light** while in dark mode (click → light).
 */
export function ShellThemeToggle(props: { className?: string }) {
  const { mode, toggleLightDark } = useShellTheme();
  const label = mode === "light" ? "dark" : "light";
  const title = mode === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      className={props.className ?? themeToggleTextClass}
      onClick={toggleLightDark}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  );
}
