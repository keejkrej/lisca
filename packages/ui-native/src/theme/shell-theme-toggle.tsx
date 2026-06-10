import { Moon, Sun } from "lucide-react-native";
import { Pressable } from "react-native";

import { shellChromeMetrics, shellGhostIconButtonStyle } from "../shell/chrome/shell-chrome.ts";
import { useShellTheme } from "./shell-theme.tsx";

export function ShellThemeToggle() {
  const { mode, toggleLightDark, colors } = useShellTheme();
  const title = mode === "light" ? "Switch to dark theme" : "Switch to light theme";
  const Icon = mode === "light" ? Moon : Sun;

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={toggleLightDark}
      style={shellGhostIconButtonStyle}
    >
      <Icon color={colors.foreground} size={shellChromeMetrics.iconSize} strokeWidth={2} />
    </Pressable>
  );
}
