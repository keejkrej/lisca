import { useThemeColors } from "../../theme/use-theme-colors";

/**
 * Skia-safe canvas fill matching the surrounding `bg-background` viewport.
 * Web equivalent: `resolvedCanvasBackground` in `@lisca/ui/features/canvas/canvas-theme`.
 */
export function useCanvasBackground(): string {
  return useThemeColors().background;
}
