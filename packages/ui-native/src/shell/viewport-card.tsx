import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function ViewportCard({ children }: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.canvasBackground, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
});
