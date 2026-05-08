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
  const routes = ["assay", "info", "align", "inspect", "result"] as const;
  return (
    <nav className="mt-2 flex max-w-xl flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-normal">
      {routes.map((id) => (
        <Link key={id} to={`/${id}`} className={linkClass}>
          {id}
        </Link>
      ))}
    </nav>
  );
}

export function StudioShellPage(props: { routeId: string }) {
  return (
    <AppShell>
      <AppShell.Top>
        <div className="flex flex-col items-center justify-center border-b border-neutral-200 bg-white py-6">
          <span className="text-sm font-medium text-neutral-500">studio — top</span>
          <RouteNav />
        </div>
      </AppShell.Top>
      <AppShell.Left>
        <PanelLabel>studio — left</PanelLabel>
      </AppShell.Left>
      <AppShell.Main>
        <PanelLabel>studio — main ({props.routeId})</PanelLabel>
      </AppShell.Main>
      <AppShell.Bottom>
        <PanelLabel>studio — bottom</PanelLabel>
      </AppShell.Bottom>
      <AppShell.Right>
        <PanelLabel>studio — right</PanelLabel>
      </AppShell.Right>
    </AppShell>
  );
}
