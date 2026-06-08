import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react-native";
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
  const CollapseIcon = collapsed ? ChevronRight : ChevronDown;

  return (
    <View
      style={[
        styles.panel,
        { borderColor: colors.border, backgroundColor: colors.background },
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
            accessibilityState={{ expanded: !collapsed }}
            hitSlop={8}
            onPress={() => setCollapsed((current) => !current)}
            style={styles.collapseButton}
          >
            <CollapseIcon color={colors.mutedForeground} size={16} strokeWidth={2} />
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
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  content: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
