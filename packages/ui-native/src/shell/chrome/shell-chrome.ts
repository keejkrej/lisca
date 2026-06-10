import type { ShellThemeColors, ShellThemeMode } from "../../theme/tokens";

/** Matches web `buttonVariants` size `sm` / `icon-sm` in shell navbar. */
export const shellChromeMetrics = {
  height: 32,
  radius: 10,
  paddingHorizontal: 10,
  gap: 6,
  fontSize: 14,
  iconSize: 16,
  iconButtonSize: 32,
} as const;

/** Web `shadow-xs/5` + `before:shadow-[0_1px_black/4%]` on outline controls in light mode. */
export function shellOutlineElevation(mode: ShellThemeMode) {
  if (mode === "dark") return {};
  return {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    elevation: 1,
  };
}

export function shellOutlineSurface(colors: ShellThemeColors, mode: ShellThemeMode) {
  return {
    borderColor: colors.input,
    backgroundColor: colors.outlineSurface,
    ...shellOutlineElevation(mode),
  };
}

export const shellOutlineButtonStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  height: shellChromeMetrics.height,
  borderRadius: shellChromeMetrics.radius,
  paddingHorizontal: shellChromeMetrics.paddingHorizontal,
  borderWidth: 1,
  gap: shellChromeMetrics.gap,
};

export const shellGhostIconButtonStyle = {
  alignItems: "center" as const,
  justifyContent: "center" as const,
  width: shellChromeMetrics.iconButtonSize,
  height: shellChromeMetrics.iconButtonSize,
  borderRadius: shellChromeMetrics.radius,
};
