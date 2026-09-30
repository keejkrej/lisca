import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
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
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  const task = (
    status: "running" | "cancelled",
    updatedAtMs: number,
    kind = "crop-roi",
    taskId = "crop-task",
  ) => ({
    taskId,
    kind,
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
  const step = (status: "running" | "cancelled") => ({
    stepId: "crop-position-7",
    taskId: "crop-task",
    stepKind: "crop-position-7",
    workspaceId: "workspace-1",
    status,
    weight: 1,
    enqueueOrder: 6,
    dependencies: [],
    blockedBy: [],
    attempts: [
      {
        attemptId: "attempt-1",
        taskId: "crop-task",
        stepId: "crop-position-7",
        status,
        startedAtMs: 10,
        finishedAtMs: status === "running" ? null : 20,
        error: null,
      },
    ],
  });
  const detail = (status: "running" | "cancelled", updatedAtMs: number) => ({
    task: task(status, updatedAtMs),
    steps: [step(status)],
  });
  const getTask = vi.fn(async () => detail("running", 1));
  const cancelStep = vi.fn(async () => detail("cancelled", 2));
  const retryStep = vi.fn(async () => detail("running", 3));

  return {
    task,
    getTask,
    cancelStep,
    retryStep,
    gateway: {
      listTasks: async () => [
        task("running", 1),
        task("running", 1, "analysis/transfection", "analysis-task"),
      ],
      getTask,
      getStep: vi.fn(async () => step("running")),
      cancelTask: vi.fn(async () => detail("cancelled", 2)),
      cancelStep,
      retryStep,
    },
    subscribe: vi.fn(({ onSnapshot }: { onSnapshot: (snapshot: readonly unknown[]) => void }) => {
      onSnapshot([
        task("running", 1),
        task("running", 1, "analysis/transfection", "analysis-task"),
      ]);
      return () => undefined;
    }),
  };
});

vi.mock("@lisca/client/session/task-center", () => ({
  createTaskCenterGateway: () => mocks.gateway,
  subscribeTaskCenterTasks: mocks.subscribe,
}));

import { StudioNavRail } from "../src/components/studio-nav-rail";
import { StudioTopBar } from "../src/components/studio-top-bar";

function StudioShellFixture() {
  const workspace = useShellWorkspace();
  const route = useRouterState({ select: (state) => state.location.href });
  const [edit, setEdit] = createSignal("unsaved phenotype label");

  onMount(() => workspace.setWorkspacePath("/experiments/studio-demo"));

  return (
    <div class="h-screen">
      <StudioNavRail />
      <StudioTopBar showExpert />
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

function renderStudioShell(initial = "/align?position=7") {
  const rootRoute = createRootRoute();
  const routeFor = (path: string) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: StudioShellFixture,
    });
  const routeTree = rootRoute.addChildren([
    routeFor("/align"),
    routeFor("/analysis"),
    routeFor("/annotate"),
    routeFor("/metadata"),
    routeFor("/assay"),
  ]);
  const history = createMemoryHistory({ initialEntries: [initial] });
  const router = createRouter({ routeTree, history });

  return {
    router,
    ...render(() => (
      <ShellThemeProvider appId="studio">
        <ShellServerProvider>
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
  it("hides tasks away from Align and Analysis", async () => {
    renderStudioShell("/annotate");
    expect(await screen.findByRole("button", { name: /Expert mode$/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Tasks/ })).toBeNull();
  });

  it("lists analysis tasks on the Analysis page", async () => {
    renderStudioShell("/analysis");
    fireEvent.click(await screen.findByRole("button", { name: "Tasks, 1 active" }));
    expect(await screen.findByRole("dialog", { name: "Tasks" })).toBeTruthy();
    expect(screen.getByText("Background analysis computations")).toBeTruthy();
    expect(
      await screen.findByRole("button", { name: /Expand Analysis\/transfection/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Expand Crop ROI/ })).toBeNull();
  });

  it("inspects and controls a crop task without losing route, workspace, or edit state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const { router } = renderStudioShell();

    const trigger = await screen.findByRole("button", { name: "Tasks, 1 active" });
    const expert = screen.getByRole("button", { name: /Expert mode$/ });
    expect(["true", "false"]).toContain(expert.getAttribute("aria-pressed"));
    expect(expert.querySelector('[data-slot="instrument-toggle-indicator"]')).toBeTruthy();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const statusBar = screen.getByRole("region", { name: "Studio status bar" });

    expect(nav.classList.contains("px-7")).toBe(true);
    expect(nav.classList.contains("items-center")).toBe(true);
    expect(nav.classList.contains("pl-12")).toBe(false);
    expect(nav.contains(trigger)).toBe(false);
    expect(statusBar.contains(trigger)).toBe(true);
    expect(trigger.parentElement?.contains(expert)).toBe(true);
    expect(trigger.compareDocumentPosition(expert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const edit = screen.getByRole("textbox", { name: "Current edit" }) as HTMLInputElement;
    const routeState = screen.getByLabelText("Route state");
    const workspaceState = screen.getByLabelText("Workspace state");
    fireEvent.input(edit, { target: { value: "edited unsaved phenotype" } });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Tasks" });
    expect(dialog.textContent).toContain("Background crop computations");

    fireEvent.click(screen.getByRole("button", { name: /Expand Crop ROI/ }));
    await screen.findByText("Current step");
    expect(mocks.getTask).toHaveBeenCalledWith("crop-task", expect.any(AbortSignal));
    expectStudioState(router.state.location.href, edit, routeState, workspaceState);

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() =>
      expect(mocks.gateway.cancelTask).toHaveBeenCalledWith("crop-task", expect.any(AbortSignal)),
    );
    const retry = await screen.findByRole("button", { name: "Retry" });
    expectStudioState(router.state.location.href, edit, routeState, workspaceState);

    fireEvent.click(retry);
    await waitFor(() =>
      expect(mocks.retryStep).toHaveBeenCalledWith("crop-position-7", expect.any(AbortSignal)),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).toBeNull());
    expectStudioState(router.state.location.href, edit, routeState, workspaceState);

    fireEvent.click(screen.getByRole("button", { name: "Close Tasks" }));
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
  expect(routeHref).toBe("/align?position=7");
  expect(routeState.textContent).toBe("/align?position=7");
  expect(workspaceState.textContent).toBe("/experiments/studio-demo");
  expect(edit.value).toBe("edited unsaved phenotype");
}
