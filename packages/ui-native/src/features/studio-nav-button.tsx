import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function StudioNavButton(props: {
  active: boolean;
  children: ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useShellTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: props.active }}
      onPress={props.onPress}
      style={({ pressed }) => [styles.root, pressed ? { opacity: 0.7 } : null]}
    >
      <Text
        numberOfLines={2}
        style={[styles.label, { color: props.active ? colors.foreground : colors.mutedForeground }]}
      >
        {props.children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: "100%",
  },
  label: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
});
