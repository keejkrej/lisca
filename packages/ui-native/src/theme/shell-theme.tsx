import { liscaLocalStorage } from "@lisca/storage";
import {
  createContext,
  useContext,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { shellThemeColors, type ShellThemeColors, type ShellThemeMode } from "./tokens";

type ShellThemeContextValue = {
  mode: ShellThemeMode;
  setMode: (mode: ShellThemeMode) => void;
  resolvedTheme: ShellThemeMode;
  colors: ShellThemeColors;
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
  const raw = liscaLocalStorage().getItem(storageKey);
  if (raw === "light" || raw === "dark") return raw;
  return fallback;
}

function themeReducer(state: ShellThemeMode, action: ThemeAction): ShellThemeMode {
  const next = action.type === "setMode" ? action.mode : state === "dark" ? "light" : "dark";
  liscaLocalStorage().setItem(action.storageKey, next);
  return next;
}

function createThemeControls(dispatch: Dispatch<ThemeAction>, storageKeyRef: { current: string }) {
  return {
    setMode: (mode: ShellThemeMode) =>
      dispatch({ type: "setMode", mode, storageKey: storageKeyRef.current }),
    toggleLightDark: () => dispatch({ type: "toggle", storageKey: storageKeyRef.current }),
  };
}

export function ShellThemeProvider(props: {
  children: ReactNode;
  defaultMode?: ShellThemeMode;
  storageKey?: string;
}) {
  const defaultMode = props.defaultMode ?? "light";
  const storageKey = props.storageKey ?? DEFAULT_STORAGE_KEY;
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;
  const [mode, dispatch] = useReducer(themeReducer, defaultMode, (fallback) =>
    readStoredMode(storageKey, fallback),
  );
  const controlsRef = useRef<ReturnType<typeof createThemeControls>>(null!);
  if (!controlsRef.current) {
    controlsRef.current = createThemeControls(dispatch, storageKeyRef);
  }

  return (
    <ShellThemeControlsContext.Provider value={controlsRef.current}>
      <ShellThemeModeContext.Provider value={mode}>{props.children}</ShellThemeModeContext.Provider>
    </ShellThemeControlsContext.Provider>
  );
}

export function useShellTheme(): ShellThemeContextValue {
  const mode = useContext(ShellThemeModeContext);
  const controls = useContext(ShellThemeControlsContext);
  if (!mode || !controls) throw new Error("useShellTheme must be used within ShellThemeProvider");
  return {
    mode,
    setMode: controls.setMode,
    resolvedTheme: mode,
    colors: shellThemeColors[mode],
    toggleLightDark: controls.toggleLightDark,
  };
}
