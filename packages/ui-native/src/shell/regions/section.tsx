import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useShellTheme } from "../../theme/shell-theme";
import { liscaType } from "../../theme/typography";

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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>{props.title}</Text>
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
        {props.description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {props.description}
          </Text>
        ) : null}
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  title: {
    ...liscaType.sectionTitle,
    flex: 1,
    lineHeight: 14,
    minWidth: 0,
  },
  description: {
    ...liscaType.bodySmall,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
  },
  collapseButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 24,
    justifyContent: "center",
    marginRight: -4,
    marginTop: -4,
    width: 24,
  },
  content: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
