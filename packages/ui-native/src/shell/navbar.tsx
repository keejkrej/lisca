import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ConnectionStatus } from "./connection-status.tsx";
import { PathButton } from "./path-button.tsx";
import { useShellServer } from "../state/shell-server.tsx";
import { useShellWorkspace } from "../state/workspace.tsx";
import { ShellThemeToggle } from "../theme/shell-theme-toggle.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";

export type ShellNavbarRouteItem = {
  value: string;
  label: string;
};

export type ShellNavbarProps = {
  routeItems: ShellNavbarRouteItem[];
  routeValue: string;
  onRouteChange: (value: string) => void;
  onPickWorkspace: () => void;
  onPickSource: () => void;
  showRouteToggle?: boolean;
  showToolsMenu?: boolean;
  showSourceButton?: boolean;
  endLeading?: ReactNode;
  workspaceTrailing?: ReactNode;
};

export function ShellNavbar(props: ShellNavbarProps) {
  const server = useShellServer();
  const workspace = useShellWorkspace();
  const { colors } = useShellTheme();

  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.leading}>
        <PathButton
          icon={<FolderIcon color={colors.foreground} />}
          label="Workspace"
          value={workspace.workspacePath}
          onPress={props.onPickWorkspace}
        />
        {props.workspaceTrailing}
        {props.showSourceButton === false ? null : (
          <PathButton
            disabled={!workspace.workspacePath}
            icon={<SourceIcon color={colors.foreground} />}
            label="Source"
            value={workspace.sourcePath}
            onPress={workspace.workspacePath ? props.onPickSource : undefined}
          />
        )}
        {props.showRouteToggle === false ? (
          props.routeItems.map((item) => (
            <View key={item.value}>
              <RouteLabel active={item.value === props.routeValue} label={item.label} />
            </View>
          ))
        ) : null}
      </View>

      <View style={styles.trailing}>
        <Pressable onPress={server.openSettings}>
          <ConnectionStatus state={server.state} />
        </Pressable>
        {props.showToolsMenu !== false ? props.endLeading : null}
        <ShellThemeToggle />
      </View>
    </ScrollView>
  );
}

function RouteLabel(props: { label: string; active: boolean }) {
  const { colors } = useShellTheme();
  return (
    <Text
      style={[
        styles.routeText,
        { color: props.active ? colors.primary : colors.foreground },
      ]}
    >
      {props.label}
    </Text>
  );
}

function FolderIcon(props: { color: string }) {
  return <View style={[styles.iconBox, { borderColor: props.color }]} />;
}

function SourceIcon(props: { color: string }) {
  return <View style={[styles.iconDisk, { borderColor: props.color }]} />;
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 48,
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flexShrink: 1,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  routeText: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  iconBox: {
    width: 14,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 2,
  },
  iconDisk: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 7,
  },
});
