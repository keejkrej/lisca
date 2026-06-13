import { useShellTheme } from "../../theme/shell-theme";

/**
 * Skia-safe canvas fill matching the surrounding `bg-background` viewport.
 * Web equivalent: `resolvedCanvasBackground` in `@lisca/ui/features/canvas/canvas-theme`.
 */
export function useCanvasBackground(): string {
  return useShellTheme().colors.background;
}
