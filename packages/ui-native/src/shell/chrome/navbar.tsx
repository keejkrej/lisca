import type { ReactNode } from "react";
import { Folder, HardDrive } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { ScrollView, View } from "react-native";

import { ConnectionStatus } from "./connection-status";
import { PathButton } from "./path-button";
import { shellChromeMetrics } from "./shell-chrome";
import { useShellServer } from "../server/shell-server";
import { useShellWorkspace } from "../workspace/workspace";
import { ShellThemeToggle } from "../../theme/shell-theme-toggle";
import { shellThemeColors, type ShellThemeMode } from "../../theme/tokens";

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
  const { colorScheme } = useColorScheme();
  const mode: ShellThemeMode = colorScheme === "dark" ? "dark" : "light";
  const iconColor = shellThemeColors[mode].foreground;

  return (
    <ScrollView
      horizontal
      contentContainerClassName="min-h-8 flex-grow flex-row items-center justify-between gap-4"
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      <View className="min-w-0 shrink flex-row flex-wrap items-center gap-3">
        <PathButton
          icon={
            <Folder
              color={iconColor}
              opacity={0.8}
              size={shellChromeMetrics.iconSize}
              strokeWidth={2}
            />
          }
          label="Workspace"
          value={workspace.workspacePath}
          onPress={props.onPickWorkspace}
        />
        {props.workspaceTrailing}
        {props.showSourceButton === false ? null : (
          <PathButton
            disabled={!workspace.workspacePath}
            icon={
              <HardDrive
                color={iconColor}
                opacity={0.8}
                size={shellChromeMetrics.iconSize}
                strokeWidth={2}
              />
            }
            label="Source"
            value={workspace.sourcePath}
            onPress={workspace.workspacePath ? props.onPickSource : undefined}
          />
        )}
      </View>

      <View className="shrink-0 flex-row items-center gap-2">
        <ConnectionStatus
          state={server.state}
          wsUrl={server.wsUrl}
          onOpenSettings={server.openSettings}
        />
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
