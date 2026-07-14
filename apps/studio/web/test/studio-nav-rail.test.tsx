import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import {
  ShellServerProvider,
  ShellThemeProvider,
  ShellWorkspaceProvider,
  useShellWorkspace,
} from "@lisca/ui/shell";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/solid-router";
import { createSignal, onMount } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const operation = (status: "running" | "cancelled", updatedAtMs: number) => ({
    operationId: "crop-operation",
    kind: "crop-roi",
    workspaceId: "workspace-1",
    workspacePath: "/experiments/studio-demo",
    mutating: true,
    status,
    attention: "none" as const,
    progress: {
      total: 1,
      queued: 0,
      blocked: 0,
      running: status === "running" ? 1 : 0,
      completed: 0,
      failed: 0,
      cancelled: status === "cancelled" ? 1 : 0,
      cancellationRequested: 0,
    },
    createdAtMs: 1,
    updatedAtMs,
  });
  const task = (status: "running" | "cancelled") => ({
    taskId: "crop-position-7",
    operationId: "crop-operation",
    taskKind: "crop-position-7",
    workspaceId: "workspace-1",
    status,
    weight: 1,
    enqueueOrder: 6,
    dependencies: [],
    blockedBy: [],
    attempts: [
      {
        attemptId: "attempt-1",
        operationId: "crop-operation",
        taskId: "crop-position-7",
        status,
        startedAtMs: 10,
        finishedAtMs: status === "running" ? null : 20,
        error: null,
      },
    ],
  });
  const detail = (status: "running" | "cancelled", updatedAtMs: number) => ({
    operation: operation(status, updatedAtMs),
    tasks: [task(status)],
  });
  const getOperation = vi.fn(async () => detail("running", 1));
  const cancelTask = vi.fn(async () => detail("cancelled", 2));
  const retryTask = vi.fn(async () => detail("running", 3));

  return {
    operation,
    getOperation,
    cancelTask,
    retryTask,
    gateway: {
      listOperations: async () => [operation("running", 1)],
      getOperation,
      getTask: vi.fn(async () => task("running")),
      cancelOperation: vi.fn(async () => detail("cancelled", 2)),
      cancelTask,
      retryTask,
    },
    subscribe: vi.fn(({ onSnapshot }: { onSnapshot: (snapshot: readonly unknown[]) => void }) => {
      onSnapshot([operation("running", 1)]);
      return () => undefined;
    }),
  };
});

vi.mock("@lisca/client/session/task-center", () => ({
  createTaskCenterGateway: () => mocks.gateway,
  subscribeTaskCenterOperations: mocks.subscribe,
}));

import { StudioNavRail } from "../src/components/studio-nav-rail";

function StudioShellFixture() {
  const workspace = useShellWorkspace();
  const route = useRouterState({ select: (state) => state.location.href });
  const [edit, setEdit] = createSignal("unsaved phenotype label");

  onMount(() => workspace.setWorkspacePath("/experiments/studio-demo"));

  return (
    <div class="h-screen">
      <StudioNavRail />
      <output aria-label="Route state">{route()}</output>
      <output aria-label="Workspace state">{workspace.workspacePath}</output>
      <input
        aria-label="Current edit"
        value={edit()}
        onInput={(event) => setEdit(event.currentTarget.value)}
      />
    </div>
  );
}

function renderStudioShell() {
  const rootRoute = createRootRoute();
  const annotateRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/annotate",
    component: StudioShellFixture,
  });
  const routeTree = rootRoute.addChildren([annotateRoute]);
  const history = createMemoryHistory({ initialEntries: ["/annotate?position=7"] });
  const router = createRouter({ routeTree, history });

  return {
    router,
    ...render(() => (
      <ShellThemeProvider>
        <ShellServerProvider appId="studio" defaultPort={8767}>
          <ShellWorkspaceProvider>
            <RouterProvider router={router} />
          </ShellWorkspaceProvider>
        </ShellServerProvider>
      </ShellThemeProvider>
    )),
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("StudioNavRail Task Center", () => {
  it("inspects and controls a crop task without losing route, workspace, or edit state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const { router } = renderStudioShell();

    const trigger = await screen.findByRole("button", { name: "Tasks, 1 active" });
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const utilities = trigger.parentElement;

    expect(utilities).toBe(nav.lastElementChild);
    expect(utilities?.firstElementChild).toBe(trigger);
    expect(trigger.nextElementSibling?.textContent).toContain("Server");

    const edit = screen.getByRole("textbox", { name: "Current edit" }) as HTMLInputElement;
    const routeState = screen.getByLabelText("Route state");
    const workspaceState = screen.getByLabelText("Workspace state");
    fireEvent.input(edit, { target: { value: "edited unsaved phenotype" } });
    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Task Center" });

    fireEvent.click(screen.getByRole("button", { name: /Crop ROI.*Running/ }));
    const runningTask = await screen.findByRole("button", {
      name: /Crop Position 7.*Running/,
    });
    expect(mocks.getOperation).toHaveBeenCalledWith("crop-operation", expect.any(AbortSignal));
    fireEvent.click(runningTask);
    expect(screen.getByText("Attempts (1)")).toBeTruthy();
    expectStudioState(router.state.location.href, edit, routeState, workspaceState);

    fireEvent.click(within(runningTask.parentElement!).getByRole("button", { name: "Stop" }));
    await waitFor(() =>
      expect(mocks.cancelTask).toHaveBeenCalledWith("crop-position-7", expect.any(AbortSignal)),
    );
    const cancelledTask = await screen.findByRole("button", {
      name: /Crop Position 7.*Cancelled/,
    });
    expectStudioState(router.state.location.href, edit, routeState, workspaceState);

    fireEvent.click(within(cancelledTask.parentElement!).getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(mocks.retryTask).toHaveBeenCalledWith("crop-position-7", expect.any(AbortSignal)),
    );
    await screen.findByRole("button", { name: /Crop Position 7.*Running/ });
    expectStudioState(router.state.location.href, edit, routeState, workspaceState);

    fireEvent.click(screen.getByRole("button", { name: "Close Task Center" }));
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expectStudioState(router.state.location.href, edit, routeState, workspaceState);
  });
});

function expectStudioState(
  routeHref: string,
  edit: HTMLInputElement,
  routeState: HTMLElement,
  workspaceState: HTMLElement,
) {
  expect(routeHref).toBe("/annotate?position=7");
  expect(routeState.textContent).toBe("/annotate?position=7");
  expect(workspaceState.textContent).toBe("/experiments/studio-demo");
  expect(edit.value).toBe("edited unsaved phenotype");
}
