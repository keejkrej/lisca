/**
 * Semantic shell colors mapped from `@lisca/ui/coss-theme.css` (neutral palette).
 * Keep in sync with web `--background`, `--card`, `--popover`, `--primary`, etc.
 */
export type ShellThemeMode = "light" | "dark";

export const shellThemeColors = {
  light: {
    background: "#ffffff",
    foreground: "#171717",
    card: "#ffffff",
    cardForeground: "#171717",
    popover: "#ffffff",
    popoverForeground: "#171717",
    primary: "#171717",
    primaryForeground: "#fafafa",
    secondary: "#f5f5f5",
    secondaryForeground: "#171717",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
    accent: "#f5f5f5",
    accentForeground: "#171717",
    destructive: "#ef4444",
    destructiveForeground: "#b91c1c",
    border: "#e5e5e5",
    input: "#e0e0e0",
    ring: "#a3a3a3",
    /** Outline buttons — web `bg-popover` light / `dark:bg-input/32` */
    outlineSurface: "#ffffff",
    /** Text inputs, inactive toggles on card — web `bg-background` light / `dark:bg-input/32` */
    controlSurface: "#ffffff",
    success: "#22c55e",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    card: "#111111",
    cardForeground: "#fafafa",
    popover: "#111111",
    popoverForeground: "#fafafa",
    primary: "#fafafa",
    primaryForeground: "#171717",
    secondary: "#1a1a1a",
    secondaryForeground: "#fafafa",
    muted: "#1a1a1a",
    mutedForeground: "#a3a3a3",
    accent: "#1a1a1a",
    accentForeground: "#fafafa",
    destructive: "#ef4444",
    destructiveForeground: "#f87171",
    border: "#262626",
    input: "#2e2e2e",
    ring: "#737373",
    /** Outline buttons — web `dark:bg-input/32` (lighter than canvas background) */
    outlineSurface: "#151515",
    controlSurface: "#151515",
    success: "#22c55e",
  },
} as const;

export type ShellThemeColors = (typeof shellThemeColors)[ShellThemeMode];
