import { render, waitFor } from "@solidjs/testing-library";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vite-plus/test";

import { StudioAgentNavigation } from "../src/components/studio-agent-navigation";
import { StudioSessionContext } from "../src/state/studio-session-context";

function renderNavigation(openAssay: (path: string) => Promise<never>, sessions: () => any[]) {
  const rootRoute = createRootRoute();
  const component = () => (
    <StudioSessionContext.Provider value={{ openAssay }}>
      <StudioAgentNavigation sessions={sessions()} />
    </StudioSessionContext.Provider>
  );
  const routeFor = (path: string) =>
    createRoute({ getParentRoute: () => rootRoute, path, component });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      routeFor("/"),
      routeFor("/metadata"),
      routeFor("/align"),
      routeFor("/annotate"),
      routeFor("/analysis"),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(() => <RouterProvider router={router} />);
  return router;
}

describe("StudioAgentNavigation", () => {
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
  it("opens an idle agent workspace once and moves crop/analysis to their routes", async () => {
    const openAssay = vi.fn(async () => ({}) as never);
    const base = {
      workspacePath: "/data/demo",
      mode: "agent-running",
      agentName: "pi",
      revision: 1,
    };
    const [sessions, setSessions] = createSignal<any[]>([base]);
    const router = renderNavigation(openAssay, sessions);

    await waitFor(() => expect(openAssay).toHaveBeenCalledWith("/data/demo/assay.json"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/metadata"));

    setSessions([
      { ...base, operation: { requestId: "crop-1", kind: "crop", label: "Cropping Pos67" } },
    ]);
    await waitFor(() => expect(router.state.location.pathname).toBe("/annotate"));

    setSessions([
      {
        ...base,
        operation: { requestId: "analysis-1", kind: "analysis", label: "Running analysis" },
      },
    ]);
    await waitFor(() => expect(router.state.location.pathname).toBe("/analysis"));
    expect(openAssay).toHaveBeenCalledTimes(1);
  });
});
