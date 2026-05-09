import { AppShell, ShellNavbar } from "@lisca/ui";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

function PanelLabel(props: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center text-sm opacity-70">
      {props.children}
    </div>
  );
}

export function AnnotatorShellPage(props: { routeId: string }) {
  const navigate = useNavigate();

  return (
    <AppShell>
      <AppShell.Header>
        <ShellNavbar
          wsDefaultPort={8766}
          routeItems={[
            { value: "raw", label: "Raw" },
            { value: "roi", label: "ROI" },
          ]}
          routeValue={props.routeId}
          onRouteChange={(v: string) => navigate({ to: `/${v}` })}
        />
      </AppShell.Header>
      <AppShell.Body>
        <AppShell.Left>
          <PanelLabel>annotator — left</PanelLabel>
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <PanelLabel>annotator — main ({props.routeId})</PanelLabel>
          </AppShell.Main>
          <AppShell.Dock>
            <PanelLabel>annotator — bottom</PanelLabel>
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right>
          <PanelLabel>annotator — right</PanelLabel>
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
