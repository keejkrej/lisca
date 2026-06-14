import type { ReactNode } from "react";
import { Folder, HardDrive } from "lucide-react-native";
import { View } from "react-native";

import { ConnectionStatus } from "./connection-status";
import { PathButton } from "./path-button";
import { shellChromeMetrics } from "./shell-chrome";
import { useShellServer } from "../server/shell-server";
import { useShellWorkspace } from "../workspace/workspace";
import { useShellTheme } from "../../theme/shell-theme";
import { ShellThemeToggle } from "../../theme/shell-theme-toggle";

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
  const iconColor = colors.foreground;

  return (
    <View className="min-h-8 w-full flex-row items-center gap-4">
      <View className="min-w-0 flex-1 flex-row flex-nowrap items-center gap-3">
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
    </View>
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
