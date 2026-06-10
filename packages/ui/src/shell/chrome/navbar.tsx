import { Folder, HardDrive } from "lucide-react";
import type { ReactNode } from "react";

import { ShellThemeToggle } from "../theme/shell-theme";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
import { ConnectionStatus } from "./connection-status";
import { PathButton } from "./path-button";
import { useShellServer } from "../server/shell-server";
import { useShellWorkspace } from "../workspace/workspace";

export type ShellNavbarRouteItem = {
  value: string;
  label: string;
};

export type ShellNavbarProps = {
  routeItems: readonly ShellNavbarRouteItem[];
  routeValue: string;
  onRouteChange: (value: string) => void;
  /** Show the route switcher toggle group (default: true). */
  showRouteToggle?: boolean;
  /** Show the source path/action button (default: true). */
  showSourceButton?: boolean;
  /** Show the `endLeading` action slot (default: true). */
  showToolsMenu?: boolean;
  /** Insert next to the workspace action in the left path group. */
  workspaceTrailing?: ReactNode;
  /** Override workspace action; defaults to `workspace.pickWorkspace()`. */
  onPickWorkspace?: () => void;
  /** Override source action; defaults to `workspace.pickSource()`. */
  onPickSource?: () => void;
  /** Insert before the theme toggle (e.g. aligner Tools menu). */
  endLeading?: ReactNode;
};

/**
 * Shared shell chrome: route toggle, workspace/source paths, WS status, theme.
 * Requires `ShellServerProvider` and `ShellWorkspaceProvider` above in the tree.
 */
function ShellNavbarRoot(props: ShellNavbarProps) {
  const server = useShellServer();
  const workspace = useShellWorkspace();

  const handleSource = props.onPickSource ?? (() => workspace.pickSource());
  const handleWorkspace = props.onPickWorkspace ?? (() => workspace.pickWorkspace());

  return (
    <header className="h-full px-6">
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex min-w-0 max-w-[56rem] flex-wrap items-center justify-start gap-3">
          <PathButton
            label="Workspace"
            value={workspace.workspacePath}
            icon={<Folder className="size-4 shrink-0 opacity-80" aria-hidden />}
            onClick={handleWorkspace}
          />
          {props.workspaceTrailing}
          {props.showSourceButton === false ? null : (
            <PathButton
              label="Source"
              value={workspace.sourcePath}
              icon={<HardDrive className="size-4 shrink-0 opacity-80" aria-hidden />}
              disabled={!workspace.workspacePath}
              onClick={workspace.workspacePath ? handleSource : undefined}
            />
          )}
        </div>

        {props.showRouteToggle === false ? (
          <div />
        ) : props.routeItems.length > 1 ? (
          <div className="min-w-0 justify-self-start">
            <ToggleGroup
              className="flex-nowrap gap-1 rounded-xl border border-border bg-background p-1"
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
          <ConnectionStatus
            state={server.state}
            wsUrl={server.wsUrl}
            onOpenSettings={server.openSettings}
          />
          {props.showToolsMenu !== false && props.endLeading}
          <ShellThemeToggle />
        </div>
      </div>
    </header>
  );
}

export type ShellNavbarAnnotatorProps = {
  endLeading?: ReactNode;
  onPickWorkspace?: () => void;
};

function ShellNavbarAnnotator(props: ShellNavbarAnnotatorProps) {
  return (
    <ShellNavbarRoot
      endLeading={props.endLeading}
      routeItems={[{ value: "roi", label: "ROI" }]}
      routeValue="roi"
      showRouteToggle={false}
      showSourceButton={false}
      onPickWorkspace={props.onPickWorkspace}
      onRouteChange={() => undefined}
    />
  );
}

export type ShellNavbarAlignerProps = {
  onPickSource?: () => void;
  onPickWorkspace?: () => void;
};

function ShellNavbarAligner(props: ShellNavbarAlignerProps) {
  return (
    <ShellNavbarRoot
      routeItems={[{ value: "align", label: "Align" }]}
      routeValue="align"
      showRouteToggle={false}
      showToolsMenu={false}
      onPickSource={props.onPickSource}
      onPickWorkspace={props.onPickWorkspace}
      onRouteChange={() => undefined}
    />
  );
}

function ShellNavbarLeading(props: { children?: ReactNode }) {
  return props.children ?? null;
}

function ShellNavbarActions(props: { children?: ReactNode }) {
  return props.children ?? null;
}

export type ShellNavbarCompound = typeof ShellNavbarRoot & {
  Leading: typeof ShellNavbarLeading;
  Actions: typeof ShellNavbarActions;
  Annotator: typeof ShellNavbarAnnotator;
  Aligner: typeof ShellNavbarAligner;
};

export const ShellNavbar: ShellNavbarCompound = Object.assign(ShellNavbarRoot, {
  Leading: ShellNavbarLeading,
  Actions: ShellNavbarActions,
  Annotator: ShellNavbarAnnotator,
  Aligner: ShellNavbarAligner,
});
