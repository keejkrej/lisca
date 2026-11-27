import { Router, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { TaskCenterPort, type TaskCenterServiceShape } from "@lisca/instrument";
import {
  ShellServerProbe,
  ShellServerProvider,
  ShellThemeProvider,
  ShellWorkspaceProvider,
} from "@lisca/ui/shell";
import { Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StudioNavRail } from "../src/components/studio-nav-rail";
import {
  clearStudioTaskCenterOpen,
  openStudioTaskCenter,
} from "../src/components/studio-task-center-open";
import { StudioTopBar } from "../src/components/studio-top-bar";
import {
  StudioNavigationMessage,
  StudioNavigationProvider,
  StudioRoute,
  studioRouteForPath,
} from "../src/navigation/studio-router";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  keyDownElement,
  mountTest,
  setInputValue,
  waitForCondition,
} from "./render-helper";

function makeTaskMocks() {
  const task = (
    status: "running" | "cancelled" | "failed",
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
      failed: status === "failed" ? 1 : 0,
      cancelled: status === "cancelled" ? 1 : 0,
      cancellationRequested: 0,
    },
    createdAtMs: 1,
    updatedAtMs,
  });
  const step = (status: "running" | "cancelled" | "failed") => ({
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
  const detail = (status: "running" | "cancelled" | "failed", updatedAtMs: number) => ({
    task: task(status, updatedAtMs),
    steps: [step(status)],
  });
  const getTask = vi.fn(async () => detail("running", 1));
  const cancelTask = vi.fn(async () => detail("cancelled", 2));
  const cancelStep = vi.fn(async () => detail("cancelled", 2));
  const retryStep = vi.fn(async () => detail("running", 3));

  const gateway = {
    listTasks: async () => [
      task("running", 1),
      task("running", 1, "analysis/transfection", "analysis-task"),
    ],
    getTask,
    getStep: vi.fn(async () => step("running")),
    cancelTask,
    dismissTask: vi.fn(async () => detail("failed", 2)),
    cancelStep,
    retryStep,
  };
  const subscribe = vi.fn(
    ({ onSnapshot }: { onSnapshot: (snapshot: readonly unknown[]) => void }) => {
      onSnapshot([
        task("running", 1),
        task("running", 1, "analysis/transfection", "analysis-task"),
      ]);
      return () => undefined;
    },
  );

  const service: TaskCenterServiceShape = {
    gateway: gateway as unknown as TaskCenterServiceShape["gateway"],
    subscribe: subscribe as unknown as TaskCenterServiceShape["subscribe"],
  };

  return { task, getTask, cancelTask, cancelStep, retryStep, gateway, subscribe, service };
}

const FixtureMsg = UiSchema.TaggedEnum({
  SetEdit: { value: Schema.String },
  NavigateTo: { to: Schema.String },
});

const StudioShellFixture = Html.component({
  name: "StudioShellNavRailFixture",
  props: Schema.Struct({}),
  model: Schema.Struct({
    edit: Schema.String,
  }),
  message: FixtureMsg,
  reads: {
    workspace: ShellWorkspaceProvider,
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({ edit: "unsaved phenotype label" }),
  update: {
    SetEdit: ($, { value }) => $.evolve({ edit: value }),
    NavigateTo: ($, { to }) =>
      $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to })),
  },
  view: (h, model) =>
    h.div.class("h-screen").children(
      StudioNavRail(h, { key: "nav-rail" }),
      StudioTopBar(h, { key: "top-bar", showExpert: true }),
      h.output.attr("aria-label", "Route state").children(h.reads.nav.pathname),
      h.output
        .attr("aria-label", "Workspace state")
        .children(h.reads.workspace.workspacePath ?? ""),
      h.input
        .attr("aria-label", "Current edit")
        .value(model.edit)
        .on("input", ({ value }) => FixtureMsg.SetEdit({ value })),
      h.button
        .attr("type", "button")
        .attr("data-testid", "nav-annotate")
        .on("click", FixtureMsg.NavigateTo({ to: "/annotate" }))
        .children("Go Annotate"),
      h.button
        .attr("type", "button")
        .attr("data-testid", "nav-analysis")
        .on("click", FixtureMsg.NavigateTo({ to: "/analysis" }))
        .children("Go Analysis"),
    ),
});

async function mountStudioShell(initial = "/align?position=7", mocks = makeTaskMocks()) {
  const initialRoute = studioRouteForPath(initial.split("?")[0] ?? "/align");
  const Host = Html.component({
    name: "StudioNavRailTestHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: {},
    view: (h) =>
      ShellThemeProvider(h, {
        props: { storageKey: "studio-nav-rail-test-theme" },
        view: () =>
          ShellServerProvider(h, {
            props: {},
            view: () =>
              ShellWorkspaceProvider(h, {
                props: { initialWorkspacePath: "/experiments/studio-demo" },
                view: () =>
                  StudioNavigationProvider(h, {
                    props: { initialRoute },
                    view: () => StudioShellFixture(h, { props: {} }),
                  }),
              }),
          }),
      }),
  });

  const layer = Layer.mergeAll(
    Router.memory({ routes: StudioRoute, url: initial }),
    Layer.succeed(ShellServerProbe, undefined),
    Layer.succeed(TaskCenterPort, mocks.service),
  );
  const mounted = await mountTest(Host as any, {}, { layer: layer as any });
  const navigateTo = (to: "/annotate" | "/analysis") => {
    const selector =
      to === "/annotate" ? '[data-testid="nav-annotate"]' : '[data-testid="nav-analysis"]';
    const button = mounted.container.querySelector<HTMLButtonElement>(selector);
    if (!button) throw new Error(`Navigation button ${selector} not found`);
    clickElement(button);
  };
  return { ...mounted, mocks, navigateTo };
}

function findButton(root: ParentNode, match: string | RegExp): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll("button")).find((button) => {
    const label = button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "";
    return typeof match === "string" ? label === match : match.test(label);
  });
}

function findTasksDialog(): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find((dialog) => {
    const labelledBy = dialog.getAttribute("aria-labelledby");
    if (labelledBy && document.getElementById(labelledBy)?.textContent?.trim() === "Tasks") {
      return true;
    }
    return dialog.querySelector("h2")?.textContent?.trim() === "Tasks";
  });
}

afterEach(async () => {
  clearStudioTaskCenterOpen();
  await cleanupMounted();
  Reflect.deleteProperty(window, "liscaDesktop");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StudioNavRail Task Center", () => {
  it("replaces the normal top bar with the agent control strip", async () => {
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: {
        product: "studio",
        controlList: async () => [
          {
            workspacePath: "/experiments/studio-demo",
            mode: "agent-running",
            agentName: "Claude Code",
            operation: {
              requestId: "crop-1",
              kind: "crop",
              label: "Cropping Pos41",
              detail: "12/100 ROI frames",
            },
            revision: 3,
          },
        ],
      },
    });
    const { container } = await mountStudioShell("/align");

    await waitForCondition(() => container.textContent?.includes("Cropping Pos41"));
    expect(findButton(container, "Take over")).toBeTruthy();
    expect(findButton(container, "Stop")).toBeTruthy();
    expect(findButton(container, "Settings")).toBeUndefined();
    expect(findButton(container, /Expert mode$/)).toBeUndefined();
    const brandSpan = Array.from(container.querySelectorAll("span")).find(
      (span) => span.textContent?.trim() === "LiSCA",
    );
    expect(brandSpan).toBeUndefined();
  });

  it("hides tasks on Align and on pages that do not wait on a run", async () => {
    const first = await mountStudioShell("/align");
    await waitForCondition(() => findButton(first.container, /Expert mode$/));
    expect(findButton(first.container, /^Tasks/)).toBeUndefined();
    await cleanupMounted();

    const second = await mountStudioShell("/metadata");
    await waitForCondition(() => findButton(second.container, /Expert mode$/));
    expect(findButton(second.container, /^Tasks/)).toBeUndefined();
  });

  it("opens crop tasks when Align hands off to Annotate", async () => {
    const { container, navigateTo } = await mountStudioShell("/align");
    expect(findButton(container, /^Tasks/)).toBeUndefined();
    openStudioTaskCenter("crop");
    navigateTo("/annotate");
    const dialog = await waitForCondition(() => findTasksDialog());
    document.body.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    keyDownElement(document.body, "Escape");
    await flushMicrotasks();
    expect(dialog.isConnected).toBe(true);
    expect(dialog.textContent).toContain("Background crop computations");
  });

  it("opens analysis tasks when Annotate hands off to Analysis", async () => {
    const { navigateTo } = await mountStudioShell("/annotate");
    openStudioTaskCenter("analysis");
    navigateTo("/analysis");
    const dialog = await waitForCondition(() => findTasksDialog());
    expect(dialog.textContent).toContain("Background analysis computations");
  });

  it("lists crop tasks on Annotate", async () => {
    const { container } = await mountStudioShell("/annotate");
    const trigger = await waitForCondition(() => findButton(container, "Tasks, 1 active"));
    clickElement(trigger);
    const dialog = await waitForCondition(() => findTasksDialog());
    expect(dialog.textContent).toContain("Background crop computations");
    await waitForCondition(() => findButton(dialog, /Expand Crop ROI/));
    expect(findButton(dialog, /Expand Analysis\/transfection/)).toBeUndefined();
  });

  it("lists analysis tasks on the Analysis page", async () => {
    const { container } = await mountStudioShell("/analysis");
    const trigger = await waitForCondition(() => findButton(container, "Tasks, 1 active"));
    clickElement(trigger);
    const dialog = await waitForCondition(() => findTasksDialog());
    expect(dialog.textContent).toContain("Background analysis computations");
    await waitForCondition(() => findButton(dialog, /Expand Analysis\/transfection/));
    expect(findButton(dialog, /Expand Crop ROI/)).toBeUndefined();
  });

  it("inspects and controls a crop task without losing route, workspace, or edit state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const { container, mocks } = await mountStudioShell("/annotate");

    const trigger = await waitForCondition(() => findButton(container, "Tasks, 1 active"));
    const expert = findButton(container, /Expert mode$/)!;
    expect(expert).toBeTruthy();
    expect(["true", "false"]).toContain(expert.getAttribute("aria-pressed"));
    expect(expert.querySelector('[data-slot="instrument-toggle-indicator"]')).toBeTruthy();

    const nav = container.querySelector<HTMLElement>('nav[aria-label="Primary"]')!;
    const statusBar = container.querySelector<HTMLElement>(
      '[role="region"][aria-label="Studio status bar"]',
    )!;

    const tabs = nav.firstElementChild;
    expect(tabs?.classList.contains("ml-rail-inset")).toBe(true);
    expect(tabs?.classList.contains("w-rail-content")).toBe(true);
    expect(nav.classList.contains("pl-12")).toBe(false);
    expect(nav.contains(trigger)).toBe(false);
    expect(statusBar.contains(trigger)).toBe(true);
    expect(statusBar.classList.contains("grid")).toBe(true);
    const brandSpan = Array.from(container.querySelectorAll("span")).find(
      (span) => span.textContent?.trim() === "LiSCA",
    )!;
    expect(brandSpan.classList.contains("absolute")).toBe(false);
    expect(trigger.parentElement?.parentElement?.contains(expert)).toBe(true);
    expect(trigger.compareDocumentPosition(expert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const edit = container.querySelector<HTMLInputElement>('input[aria-label="Current edit"]')!;
    const routeState = container.querySelector<HTMLElement>('output[aria-label="Route state"]')!;
    const workspaceState = container.querySelector<HTMLElement>(
      'output[aria-label="Workspace state"]',
    )!;
    setInputValue(edit, "edited unsaved phenotype");
    clickElement(trigger);
    const dialog = await waitForCondition(() => findTasksDialog());
    expect(dialog.textContent).toContain("Background crop computations");

    clickElement(await waitForCondition(() => findButton(dialog, /Expand Crop ROI/)));
    await waitForCondition(() => dialog.textContent?.includes("Crop Position 7"));
    expect(mocks.getTask).toHaveBeenCalledWith("crop-task", expect.any(AbortSignal));
    expectStudioState(edit, routeState, workspaceState);

    clickElement(findButton(dialog, "Stop")!);
    await waitForCondition(() => mocks.cancelTask.mock.calls.length === 1);
    expect(mocks.cancelTask).toHaveBeenCalledWith("crop-task", expect.any(AbortSignal));
    const retry = await waitForCondition(() => findButton(dialog, "Retry"));
    expectStudioState(edit, routeState, workspaceState);

    clickElement(retry);
    await waitForCondition(() => mocks.retryStep.mock.calls.length === 1);
    expect(mocks.retryStep).toHaveBeenCalledWith("crop-position-7", expect.any(AbortSignal));
    await waitForCondition(() => !findButton(dialog, "Retry"));
    expectStudioState(edit, routeState, workspaceState);

    clickElement(findButton(dialog, "Close Tasks")!);
    await waitForCondition(() => !findTasksDialog());
    await waitForCondition(() => document.activeElement === trigger);
    expectStudioState(edit, routeState, workspaceState);
  });
});

function expectStudioState(
  edit: HTMLInputElement,
  routeState: HTMLElement,
  workspaceState: HTMLElement,
) {
  expect(routeState.textContent).toBe("/annotate");
  expect(workspaceState.textContent).toBe("/experiments/studio-demo");
  expect(edit.value).toBe("edited unsaved phenotype");
}
