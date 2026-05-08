import { AppShell } from "@lisca/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function PanelLabel(props: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center text-sm font-medium text-neutral-500">
      {props.children}
    </div>
  );
}

function RouteNav() {
  const linkClass =
    "text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline";
  return (
    <nav className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs font-normal">
      <Link to="/raw" className={linkClass}>
        raw
      </Link>
      <Link to="/roi" className={linkClass}>
        roi
      </Link>
    </nav>
  );
}

export function AnnotatorShellPage(props: { routeId: string }) {
  return (
    <AppShell>
      <AppShell.Top>
        <div className="flex flex-col items-center justify-center border-b border-neutral-200 bg-white py-6">
          <span className="text-sm font-medium text-neutral-500">annotator — top</span>
          <RouteNav />
        </div>
      </AppShell.Top>
      <AppShell.Left>
        <PanelLabel>annotator — left</PanelLabel>
      </AppShell.Left>
      <AppShell.Main>
        <PanelLabel>annotator — main ({props.routeId})</PanelLabel>
      </AppShell.Main>
      <AppShell.Bottom>
        <PanelLabel>annotator — bottom</PanelLabel>
      </AppShell.Bottom>
      <AppShell.Right>
        <PanelLabel>annotator — right</PanelLabel>
      </AppShell.Right>
    </AppShell>
  );
}
