import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function Section(props: {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children?: ReactNode;
  defaultCollapsed?: boolean;
  contentStyle?: object;
  style?: object;
}) {
  const { colors } = useShellTheme();
  const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);

  return (
    <View
      style={[
        styles.panel,
        { borderColor: colors.border, backgroundColor: colors.panel },
        props.style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>{props.title}</Text>
          {props.description ? (
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {props.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {props.headerAction}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={collapsed ? `Expand ${props.title}` : `Collapse ${props.title}`}
            hitSlop={8}
            onPress={() => setCollapsed((current) => !current)}
            style={styles.collapseButton}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              {collapsed ? "▸" : "▾"}
            </Text>
          </Pressable>
        </View>
      </View>
      {!collapsed ? (
        <View style={[styles.content, props.contentStyle]}>{props.children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  collapseButton: {
    padding: 4,
  },
  content: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
