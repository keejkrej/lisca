import { AppShell, ShellThemeToggle } from "@lisca/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

function PanelLabel(props: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center text-sm opacity-70">
      {props.children}
    </div>
  );
}

function RouteNav() {
  const linkClass =
    "text-xs underline underline-offset-2 opacity-80 hover:opacity-100";
  return (
    <nav className="mt-1 flex flex-wrap justify-center gap-x-6 gap-y-1">
      <Link to="/align" className={linkClass}>
        align
      </Link>
      <Link to="/inspect" className={linkClass}>
        inspect
      </Link>
    </nav>
  );
}

export function AlignerShellPage(props: { routeId: string }) {
  return (
    <AppShell>
      <AppShell.Top>
        <div className="relative flex flex-col items-center py-2">
          <div className="absolute right-3 top-3">
            <ShellThemeToggle />
          </div>
          <span className="text-sm opacity-70">aligner — top</span>
          <RouteNav />
        </div>
      </AppShell.Top>
      <AppShell.Left>
        <PanelLabel>aligner — left</PanelLabel>
      </AppShell.Left>
      <AppShell.Main>
        <PanelLabel>aligner — main ({props.routeId})</PanelLabel>
      </AppShell.Main>
      <AppShell.Bottom>
        <PanelLabel>aligner — bottom</PanelLabel>
      </AppShell.Bottom>
      <AppShell.Right>
        <PanelLabel>aligner — right</PanelLabel>
      </AppShell.Right>
    </AppShell>
  );
}
