import type { LiscaWorkspaceControl } from "@lisca/client/desktop";
import { createEffect, useContext } from "solid-js";

import { useStudioNavigate } from "../navigation/use-studio-navigate";
import type { StudioRouteTo } from "../navigation/use-studio-navigate";
import { StudioSessionContext } from "../state/studio-session-context";

const openedWorkspaces = new Set<string>();
const workspaceRoutes = new Map<string, StudioRouteTo>();
let lastOperationKey: string | null = null;

/**
 * Follow backend agent work in the visible Studio session. Opening and route
 * changes are keyed by workspace and operation id, so progress polling does not
 * repeatedly reset the page.
 */
export function StudioAgentNavigation(props: { sessions: LiscaWorkspaceControl[] }) {
  const session = useContext(StudioSessionContext);
  const { navigateTo } = useStudioNavigate();

  createEffect(() => {
    const current = props.sessions[0];
    if (!session || !current || current.mode !== "agent-running") return;
    const operation = current.operation;
    if (!operation && openedWorkspaces.has(current.workspacePath)) return;
    const operationKey = `${current.workspacePath}:${operation?.requestId ?? "session"}`;
    if (operationKey === lastOperationKey) return;
    lastOperationKey = operationKey;

    void (async () => {
      if (!openedWorkspaces.has(current.workspacePath)) {
        await session.openAssay(`${current.workspacePath}/assay.json`);
        openedWorkspaces.add(current.workspacePath);
      }
      const route = operationRoute(current);
      if (workspaceRoutes.get(current.workspacePath) === route) return;
      workspaceRoutes.set(current.workspacePath, route);
      navigateTo(route);
    })().catch((cause: unknown) => {
      console.error("Could not follow the agent workspace", cause);
    });
  });
  return null;
}

function operationRoute(session: LiscaWorkspaceControl): StudioRouteTo {
  switch (session.operation?.kind) {
    case "crop":
      return "/annotate";
    case "analysis":
      return "/analysis";
    default: {
      const label = session.operation?.label.toLowerCase() ?? "";
      if (label.includes("align")) return "/align";
      return "/metadata";
    }
  }
}
