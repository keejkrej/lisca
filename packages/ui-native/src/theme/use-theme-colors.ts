import { useColorScheme } from "nativewind";

import { THEME } from "../../lib/theme";
import type { ShellThemeMode } from "./tokens";

/** Resolved semantic colors for native APIs that need literal color strings (e.g. Slider tints). */
export function useThemeColors(modeOverride?: ShellThemeMode) {
  const { colorScheme } = useColorScheme();
  const mode = modeOverride ?? colorScheme ?? "light";
  return THEME[mode === "dark" ? "dark" : "light"];
}
