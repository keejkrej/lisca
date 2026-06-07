export type ShellThemeMode = "light" | "dark";

export const shellThemeColors = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "#f4f4f5",
    mutedForeground: "#71717a",
    border: "#e4e4e7",
    primary: "#2563eb",
    primaryForeground: "#ffffff",
    destructive: "#dc2626",
    success: "#16a34a",
    panel: "#fafafa",
    canvasBackground: "#18181b",
  },
  dark: {
    background: "#09090b",
    foreground: "#fafafa",
    muted: "#27272a",
    mutedForeground: "#a1a1aa",
    border: "#3f3f46",
    primary: "#3b82f6",
    primaryForeground: "#ffffff",
    destructive: "#ef4444",
    success: "#22c55e",
    panel: "#18181b",
    canvasBackground: "#09090b",
  },
} as const;

export type ShellThemeColors = (typeof shellThemeColors)[ShellThemeMode];
