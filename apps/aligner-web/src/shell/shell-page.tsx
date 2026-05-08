import { AppShell, type ShellWsProbe, useShellWsProbe, useShellWorkspace } from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { AlignerTopBar } from "./top-bar";
import { MODE_STORAGE_KEY, modeToPath, type AlignerMode } from "./mode";

export function AlignerShellPage(props: {
  mode: AlignerMode;
  children: (probe: ShellWsProbe) => ReactNode;
}) {
  const navigate = useNavigate();
  const probe = useShellWsProbe({ defaultPort: 8765 });
  const workspace = useShellWorkspace();

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(MODE_STORAGE_KEY, props.mode);
  }, [props.mode]);

  return (
    <AppShell
      header={
        <AlignerTopBar
          mode={props.mode}
          onModeChange={(next) => void navigate({ to: modeToPath(next), replace: true })}
          workspacePath={workspace.workspacePath}
          sourcePath={workspace.sourcePath}
          onPickWorkspace={workspace.pickWorkspace}
          onPickSource={workspace.pickSource}
          probe={probe}
        />
      }
    >
      {props.children(probe)}
    </AppShell>
  );
}
