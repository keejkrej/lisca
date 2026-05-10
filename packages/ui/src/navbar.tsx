import { Folder, HardDrive } from "lucide-react";
import type { ReactNode } from "react";

import { ShellThemeToggle } from "./shell-theme";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { ConnectionStatus } from "./connection-status";
import { PathButton } from "./path-button";
import { useShellWsProbe } from "./use-shell-ws-probe";
import { useShellWorkspace } from "./workspace";

export type ShellNavbarRouteItem = {
  value: string;
  label: string;
};

export type ShellNavbarProps = {
  /** Product WebSocket port when env vars are unset (see AGENTS.md port table). */
  wsDefaultPort: number;
  routeItems: readonly ShellNavbarRouteItem[];
  routeValue: string;
  onRouteChange: (value: string) => void;
  /** Show the route switcher toggle group (default: true). */
  showRouteToggle?: boolean;
  /** Show the `endLeading` action slot (default: true). */
  showToolsMenu?: boolean;
  /** Override source action; defaults to `workspace.pickSource()`. */
  onPickSource?: () => void;
  /** Insert before the theme toggle (e.g. aligner Tools menu). */
  endLeading?: ReactNode;
};

/**
 * Shared shell chrome: route toggle, workspace/source paths, WS status, theme.
 * Requires `ShellWorkspaceProvider` above in the tree.
 */
export function ShellNavbar(props: ShellNavbarProps) {
  const ws = useShellWsProbe({ defaultPort: props.wsDefaultPort });
  const workspace = useShellWorkspace();

  const handleSource = props.onPickSource ?? (() => workspace.pickSource());

  return (
    <header className="h-full bg-background px-6">
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex min-w-0 max-w-[56rem] flex-wrap items-center justify-start gap-3">
          <PathButton
            label="Workspace"
            value={workspace.workspacePath}
            icon={<Folder className="size-4 shrink-0 opacity-80" aria-hidden />}
            onClick={() => workspace.pickWorkspace()}
          />
          <PathButton
            label="Source"
            value={workspace.sourcePath}
            icon={<HardDrive className="size-4 shrink-0 opacity-80" aria-hidden />}
            disabled={!workspace.workspacePath}
            onClick={workspace.workspacePath ? handleSource : undefined}
          />
        </div>

        {props.showRouteToggle === false ? (
          <div />
        ) : props.routeItems.length > 1 ? (
          <div className="min-w-0 justify-self-start">
            <ToggleGroup
              className="flex-nowrap gap-1 rounded-xl border border-border bg-muted/35 p-1"
              multiple={false}
              size="sm"
              value={[props.routeValue]}
              onValueChange={(next) => {
                const v = next[0];
                if (v) props.onRouteChange(v);
              }}
            >
              {props.routeItems.map((item) => (
                <ToggleGroupItem key={item.value} value={item.value} className="min-w-[4.5rem]">
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ) : (
          <div />
        )}

        <div className="flex min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2">
          <ConnectionStatus wsUrl={ws.wsUrl} state={ws.state} />
          {props.showToolsMenu !== false && props.endLeading}
          <ShellThemeToggle />
        </div>
      </div>
    </header>
  );
}
