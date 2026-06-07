import { Pressable, StyleSheet, Text, View } from "react-native";

import { ConnectionStatus } from "./connection-status.tsx";
import { Button } from "./buttons.tsx";
import { useShellServer } from "../state/shell-server.tsx";
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
  endLeading?: React.ReactNode;
};

export function ShellNavbar(props: ShellNavbarProps) {
  const server = useShellServer();
  const { colors } = useShellTheme();

  return (
    <View style={styles.root}>
      <View style={styles.leading}>
        {props.routeItems.map((item) => (
          <Text
            key={item.value}
            style={[
              styles.route,
              {
                color: item.value === props.routeValue ? colors.primary : colors.foreground,
              },
            ]}
          >
            {item.label}
          </Text>
        ))}
        {props.endLeading}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={server.openSettings}>
          <ConnectionStatus state={server.state} />
        </Pressable>
        <Button label="Workspace" variant="outline" compact onPress={props.onPickWorkspace} />
        <Button label="Source" variant="outline" compact onPress={props.onPickSource} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  route: {
    fontSize: 16,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
