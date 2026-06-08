import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

/** Padded main-column frame for canvas, plots, and other primary viewport content. */
export function ViewportCard({ children }: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <View style={[styles.inner, { backgroundColor: colors.panel, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minHeight: 0,
    padding: 12,
  },
  inner: {
    flex: 1,
    minHeight: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
});
