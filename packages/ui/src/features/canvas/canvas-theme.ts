import { createEffect, onCleanup, onMount } from "solid-js";
import { useShellTheme } from "../../shell/theme/shell-theme";

/**
 * Background color for canvas 2D fills. Prefers the live `--background` token on
 * `documentElement` so theme toggles are not subject to stale element styles.
 */
export function resolvedCanvasBackground(element?: HTMLElement | null): string {
  const root = document.documentElement;
  const fromVar = getComputedStyle(root).getPropertyValue("--background").trim();
  if (fromVar) return fromVar;

  if (element) {
    const color = getComputedStyle(element).backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
      return color;
    }
  }

  const rootColor = getComputedStyle(root).backgroundColor;
  if (rootColor && rootColor !== "rgba(0, 0, 0, 0)" && rootColor !== "transparent") {
    return rootColor;
  }

  return root.classList.contains("dark") ? "oklch(0.145 0 0)" : "oklch(1 0 0)";
}

/**
 * Redraw when the shell light/dark mode changes. Subscribes to `ShellThemeProvider`
 * (class toggle runs in a parent effect first) and keeps a MutationObserver backup.
 */
export function useCanvasThemeRerender(rerender: () => void) {
  const theme = useShellTheme();

  createEffect(() => {
    theme.mode;
    const id = window.requestAnimationFrame(() => {
      rerender();
    });
    onCleanup(() => window.cancelAnimationFrame(id));
  });

  onMount(() => {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(rerender);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    onCleanup(() => observer.disconnect());
  });
}
