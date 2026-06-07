import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { DockButton } from "./buttons.tsx";
import { dockToolLabel, useDockToolShortcuts, type DockToolAction } from "./dock-tool-shortcuts.ts";

export type DockToolGridProps = {
  actions: readonly DockToolAction[];
  enabled?: boolean;
  columns?: 1 | 2;
  style?: object;
  renderAction?: (action: DockToolAction, index: number, label: string) => ReactNode;
};

export function DockToolGrid({
  actions,
  enabled = true,
  columns = 2,
  style,
  renderAction,
}: DockToolGridProps) {
  useDockToolShortcuts(actions, { enabled });

  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel="Tool shortcuts"
      style={[columns === 2 ? styles.grid2 : styles.grid1, style]}
    >
      {actions.map((action, index) => {
        const label = dockToolLabel(action.label, index);
        if (renderAction) {
          return <View key={action.id}>{renderAction(action, index, label)}</View>;
        }
        return (
          <DockButton
            key={action.id}
            active={action.active}
            disabled={action.disabled}
            label={label}
            style={styles.toolButton}
            onPress={action.onSelect}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid2: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 0,
  },
  grid1: {
    flex: 1,
    gap: 8,
    minHeight: 0,
  },
  toolButton: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 120,
  },
});
