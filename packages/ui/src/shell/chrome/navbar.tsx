import IconFolderRegular from "phosphor-icons-solid/IconFolderRegular";
import IconHardDriveRegular from "phosphor-icons-solid/IconHardDriveRegular";
import type { JSX } from "solid-js";
import { Show } from "solid-js";

import { ShellThemeToggle } from "../theme/shell-theme";
import { ConnectionStatus } from "./connection-status";
import { PathButton } from "./path-button";
import { useShellServer } from "../server/shell-server";
import { useShellWorkspace } from "../workspace/workspace";
import { cn } from "../../lib/utils";

export type ShellNavbarProps = {
  /** Screen-reader application title rendered as the page's primary heading. */
  title?: string;
  appearance?: "default" | "stage";
  /** Show the source path/action button (default: true). */
  showSourceButton?: boolean;
  /** Show the `endLeading` action slot (default: true). */
  showToolsMenu?: boolean;
  /** Insert next to the workspace action in the left path group. */
  workspaceTrailing?: JSX.Element;
  /** Override workspace action; defaults to `workspace.pickWorkspace()`. */
  onPickWorkspace?: () => void;
  /** Override source action; defaults to `workspace.pickSource()`. */
  onPickSource?: () => void;
  /** Insert before the theme toggle (e.g. aligner Tools menu). */
  endLeading?: JSX.Element;
};

/**
 * Shared shell chrome: workspace/source paths, server status, theme.
 * Requires `ShellServerProvider` and `ShellWorkspaceProvider` above in the tree.
 */
function ShellNavbarRoot(props: ShellNavbarProps) {
  const server = useShellServer();
  const workspace = useShellWorkspace();

  const handleSource = props.onPickSource ?? (() => workspace.pickSource());
  const handleWorkspace = props.onPickWorkspace ?? (() => workspace.pickWorkspace());

  return (
    <header class={cn("h-full", props.appearance !== "stage" && "px-6")}>
      <Show when={props.title}>{(title) => <h1 class="sr-only">{title()}</h1>}</Show>
      <div
        class={cn(
          "h-full items-center gap-4",
          props.appearance === "stage" ? "flex justify-between" : "grid grid-cols-[1fr_auto_1fr]",
        )}
      >
        <div class="flex min-w-0 max-w-[56rem] flex-wrap items-center justify-start gap-3">
          <PathButton
            appearance={props.appearance}
            label="Workspace"
            value={workspace.workspacePath}
            icon={<IconFolderRegular class="size-4 shrink-0 opacity-80" />}
            onClick={handleWorkspace}
          />
          {props.workspaceTrailing}
          <Show when={props.showSourceButton !== false}>
            <PathButton
              appearance={props.appearance}
              label="Source"
              value={workspace.sourcePath}
              icon={<IconHardDriveRegular class="size-4 shrink-0 opacity-80" />}
              preserveExtension={props.appearance === "stage"}
              disabled={!workspace.workspacePath}
              onClick={workspace.workspacePath ? handleSource : undefined}
            />
          </Show>
        </div>

        <Show when={props.appearance !== "stage"}>
          <div />
        </Show>

        <div class="flex min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2">
          <ConnectionStatus state={server.state} httpBaseUrl={server.httpBaseUrl} />
          <Show when={props.showToolsMenu !== false}>{props.endLeading}</Show>
          <ShellThemeToggle />
        </div>
      </div>
    </header>
  );
}

export type ShellNavbarAnnotatorProps = {
  appearance?: "default" | "stage";
  endLeading?: JSX.Element;
  onPickWorkspace?: () => void;
};

function ShellNavbarAnnotator(props: ShellNavbarAnnotatorProps) {
  return (
    <ShellNavbarRoot
      appearance={props.appearance}
      endLeading={props.endLeading}
      showSourceButton={false}
      title="LiSCA Annotator"
      onPickWorkspace={props.onPickWorkspace}
    />
  );
}

export type ShellNavbarAlignerProps = {
  appearance?: "default" | "stage";
  endLeading?: JSX.Element;
  onPickSource?: () => void;
  onPickWorkspace?: () => void;
};

function ShellNavbarAligner(props: ShellNavbarAlignerProps) {
  return (
    <ShellNavbarRoot
      appearance={props.appearance}
      endLeading={props.endLeading}
      showToolsMenu={props.endLeading !== undefined}
      title="LiSCA Aligner"
      onPickSource={props.onPickSource}
      onPickWorkspace={props.onPickWorkspace}
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
