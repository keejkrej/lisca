import { Moon, Sun } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { Button } from "../../components/ui/button";

export type ShellThemeMode = "light" | "dark";

type ShellThemeContextValue = {
  mode: ShellThemeMode;
  setMode: (mode: ShellThemeMode) => void;
  /** Same as `mode` (kept for callers that branch on a resolved light/dark value). */
  resolvedTheme: ShellThemeMode;
  toggleLightDark: () => void;
};

type ThemeAction =
  | { type: "setMode"; mode: ShellThemeMode; storageKey: string }
  | { type: "toggle"; storageKey: string };

const ShellThemeModeContext = createContext<ShellThemeMode | null>(null);
const ShellThemeControlsContext = createContext<{
  setMode: (mode: ShellThemeMode) => void;
  toggleLightDark: () => void;
} | null>(null);

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

function themeReducer(state: ShellThemeMode, action: ThemeAction): ShellThemeMode {
  const next = action.type === "setMode" ? action.mode : state === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(action.storageKey, next);
  } catch {
    /* ignore */
  }
  return next;
}

function createThemeControls(dispatch: Dispatch<ThemeAction>, storageKeyRef: { current: string }) {
  return {
    setMode: (mode: ShellThemeMode) =>
      dispatch({ type: "setMode", mode, storageKey: storageKeyRef.current }),
    toggleLightDark: () => dispatch({ type: "toggle", storageKey: storageKeyRef.current }),
  };
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
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;
  const [mode, dispatch] = useReducer(themeReducer, defaultMode, (fallback) => {
    if (typeof window === "undefined") return fallback;
    return readStoredMode(storageKey, fallback);
  });
  const controlsRef = useRef<ReturnType<typeof createThemeControls>>(null!);
  if (!controlsRef.current) {
    controlsRef.current = createThemeControls(dispatch, storageKeyRef);
  }
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    root.style.colorScheme = mode === "dark" ? "dark" : "light";
  }, [mode]);

  return (
    <ShellThemeControlsContext.Provider value={controlsRef.current}>
      <ShellThemeModeContext.Provider value={mode}>{props.children}</ShellThemeModeContext.Provider>
    </ShellThemeControlsContext.Provider>
  );
}

export function useShellTheme(): ShellThemeContextValue {
  const mode = useContext(ShellThemeModeContext);
  const controls = useContext(ShellThemeControlsContext);
  if (!mode || !controls) {
    throw new Error("useShellTheme must be used within ShellThemeProvider");
  }
  return {
    mode,
    setMode: controls.setMode,
    resolvedTheme: mode,
    toggleLightDark: controls.toggleLightDark,
  };
}

/**
 * Icon control: moon while in light mode (switch to dark), sun while in dark (switch to light).
 */
export function ShellThemeToggle(props: { className?: string }) {
  const { mode, toggleLightDark } = useShellTheme();
  const title = mode === "light" ? "Switch to dark theme" : "Switch to light theme";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={props.className}
      onClick={toggleLightDark}
      title={title}
      aria-label={title}
    >
      {mode === "light" ? <Moon /> : <Sun />}
    </Button>
  );
}
