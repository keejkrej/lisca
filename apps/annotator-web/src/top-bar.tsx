import {
  ShellConnectionStatus,
  ShellDriveIcon,
  ShellFolderIcon,
  ShellHeaderBar,
  ShellPathChip,
  type ShellWorkspace,
  type ShellWsProbe,
} from "@lisca/ui";

export function AnnotatorTopBar(props: {
  workspace: ShellWorkspace;
  probe: ShellWsProbe;
}) {
  return (
    <ShellHeaderBar
      start={<span className="text-sm font-semibold text-neutral-900">Annotator</span>}
      center={
        <div className="flex max-w-[56rem] flex-wrap items-center justify-center gap-3">
          <ShellPathChip
            label="Workspace"
            value={props.workspace.workspacePath}
            icon={<ShellFolderIcon />}
            onClick={props.workspace.pickWorkspace}
          />
          <ShellPathChip
            label="Source"
            value={props.workspace.sourcePath}
            icon={<ShellDriveIcon />}
            disabled={!props.workspace.workspacePath}
            onClick={
              props.workspace.workspacePath ? props.workspace.pickSource : undefined
            }
          />
        </div>
      }
      end={
        <ShellConnectionStatus wsUrl={props.probe.wsUrl} state={props.probe.state} />
      }
    />
  );
}
