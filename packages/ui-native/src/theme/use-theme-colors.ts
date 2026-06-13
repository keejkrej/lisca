import { useColorScheme } from "nativewind";

import { shellThemeColors, type ShellThemeMode } from "./tokens";

/** Resolved semantic colors for native APIs that need literal color strings (e.g. Skia, Slider tints). */
export function useThemeColors(modeOverride?: ShellThemeMode) {
  const { colorScheme } = useColorScheme();
  const mode = modeOverride ?? colorScheme ?? "light";
  return shellThemeColors[mode === "dark" ? "dark" : "light"];
}
