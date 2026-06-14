import { shellThemeColors, type ShellThemeMode } from "./tokens";
import { useShellTheme } from "./shell-theme";

/** Resolved semantic colors for native APIs that need literal color strings (e.g. Skia, Slider tints). */
export function useThemeColors(modeOverride?: ShellThemeMode) {
  const { colors } = useShellTheme();
  return modeOverride ? shellThemeColors[modeOverride] : colors;
}
