import { Pressable, StyleSheet, Text } from "react-native";

import { useShellTheme } from "./shell-theme.tsx";

export function ShellThemeToggle() {
  const { mode, toggleLightDark } = useShellTheme();
  const title = mode === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={toggleLightDark}
      style={styles.root}
    >
      <Text style={styles.icon}>{mode === "light" ? "☾" : "☀"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
  },
  icon: {
    fontSize: 16,
  },
});
