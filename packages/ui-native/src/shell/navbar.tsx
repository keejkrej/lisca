import type { ReactNode } from "react";
import { Folder, HardDrive } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";

import { ConnectionStatus } from "./connection-status.tsx";
import { PathButton } from "./path-button.tsx";
import { shellChromeMetrics } from "./shell-chrome.ts";
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

function ShellNavbarRoot(props: ShellNavbarProps) {
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
          icon={<Folder color={colors.foreground} opacity={0.8} size={shellChromeMetrics.iconSize} strokeWidth={2} />}
          label="Workspace"
          value={workspace.workspacePath}
          onPress={props.onPickWorkspace}
        />
        {props.workspaceTrailing}
        {props.showSourceButton === false ? null : (
          <PathButton
            disabled={!workspace.workspacePath}
            icon={<HardDrive color={colors.foreground} opacity={0.8} size={shellChromeMetrics.iconSize} strokeWidth={2} />}
            label="Source"
            value={workspace.sourcePath}
            onPress={workspace.workspacePath ? props.onPickSource : undefined}
          />
        )}
      </View>

      <View style={styles.trailing}>
        <ConnectionStatus state={server.state} wsUrl={server.wsUrl} onOpenSettings={server.openSettings} />
        {props.showToolsMenu !== false ? props.endLeading : null}
        <ShellThemeToggle />
      </View>
    </ScrollView>
  );
}

export type ShellNavbarAnnotatorProps = {
  endLeading?: ReactNode;
  onPickWorkspace: () => void;
};

function ShellNavbarAnnotator(props: ShellNavbarAnnotatorProps) {
  return (
    <ShellNavbarRoot
      endLeading={props.endLeading}
      routeItems={[{ value: "roi", label: "ROI" }]}
      routeValue="roi"
      showRouteToggle={false}
      showSourceButton={false}
      onPickSource={() => undefined}
      onPickWorkspace={props.onPickWorkspace}
      onRouteChange={() => undefined}
    />
  );
}

export type ShellNavbarAlignerProps = {
  endLeading?: ReactNode;
  onPickSource: () => void;
  onPickWorkspace: () => void;
};

function ShellNavbarAligner(props: ShellNavbarAlignerProps) {
  return (
    <ShellNavbarRoot
      endLeading={props.endLeading}
      routeItems={[{ value: "align", label: "Align" }]}
      routeValue="align"
      showRouteToggle={false}
      onPickSource={props.onPickSource}
      onPickWorkspace={props.onPickWorkspace}
      onRouteChange={() => undefined}
    />
  );
}

export type ShellNavbarCompound = typeof ShellNavbarRoot & {
  Annotator: typeof ShellNavbarAnnotator;
  Aligner: typeof ShellNavbarAligner;
};

export const ShellNavbar: ShellNavbarCompound = Object.assign(ShellNavbarRoot, {
  Annotator: ShellNavbarAnnotator,
  Aligner: ShellNavbarAligner,
});

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    minHeight: shellChromeMetrics.height,
  },
  leading: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    flexShrink: 1,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
});
