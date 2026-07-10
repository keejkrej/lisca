import IconMoonRegular from "phosphor-icons-solid/IconMoonRegular";
import IconSunRegular from "phosphor-icons-solid/IconSunRegular";
import { createContext, createEffect, createSignal, Show, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
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

const ShellThemeContext = createContext<ShellThemeContextValue>();

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

/**
 * Persists light/dark choice and syncs `document.documentElement` (`class="dark"` and
 * `color-scheme`) so Tailwind `dark:` utilities apply app-wide.
 */
export function ShellThemeProvider(props: {
  children?: JSX.Element;
  /** Used when nothing valid is in `localStorage`. */
  defaultMode?: ShellThemeMode;
  /** `localStorage` key for the mode string. */
  storageKey?: string;
}) {
  const defaultMode = () => props.defaultMode ?? "light";
  const storageKey = () => props.storageKey ?? DEFAULT_STORAGE_KEY;

  const initialMode =
    typeof window === "undefined"
      ? defaultMode()
      : readStoredMode(storageKey(), defaultMode());

  const [mode, setMode] = createSignal<ShellThemeMode>(initialMode);

  const dispatch = (action: ThemeAction) => {
    const next = themeReducer(mode(), action);
    setMode(next);
    setTheme({ mode: next, resolvedTheme: next });
  };

  const [theme, setTheme] = createStore<ShellThemeContextValue>({
    mode: initialMode,
    resolvedTheme: initialMode,
    setMode: (nextMode: ShellThemeMode) => {
      dispatch({ type: "setMode", mode: nextMode, storageKey: storageKey() });
    },
    toggleLightDark: () => {
      dispatch({ type: "toggle", storageKey: storageKey() });
    },
  });

  createEffect(() => {
    const root = document.documentElement;
    const current = theme.mode;
    root.classList.toggle("dark", current === "dark");
    root.style.colorScheme = current === "dark" ? "dark" : "light";
  });

  return <ShellThemeContext.Provider value={theme}>{props.children}</ShellThemeContext.Provider>;
}

export function useShellTheme(): ShellThemeContextValue {
  const value = useContext(ShellThemeContext);
  if (!value) {
    throw new Error("useShellTheme must be used within ShellThemeProvider");
  }
  return value;
}

/**
 * Icon control: moon while in light mode (switch to dark), sun while in dark (switch to light).
 */
export function ShellThemeToggle(props: { class?: string }) {
  const theme = useShellTheme();
  const title = () =>
    theme.mode === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      class={props.class}
      onClick={theme.toggleLightDark}
      title={title()}
      aria-label={title()}
    >
      <Show when={theme.mode === "light"} fallback={<IconSunRegular />}>
        <IconMoonRegular />
      </Show>
    </Button>
  );
}