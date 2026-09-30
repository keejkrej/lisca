import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => {
  const task = (status: "running" | "cancelled", updatedAtMs: number) => ({
    taskId: "crop-task",
    kind: "crop-roi",
    workspaceId: "workspace-1",
    workspacePath: "/experiments/annotator-demo",
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
      listTasks: async () => [task("running", 1)],
      getTask,
      getStep: vi.fn(async () => step("running")),
      cancelTask: vi.fn(async () => detail("cancelled", 2)),
      cancelStep,
      retryStep,
    },
    subscribe: vi.fn(({ onSnapshot }: { onSnapshot: (snapshot: readonly unknown[]) => void }) => {
      onSnapshot([task("running", 1)]);
      return () => undefined;
    }),
  };
});

vi.mock("@lisca/client/session/task-center", () => ({
  createTaskCenterGateway: () => mocks.gateway,
  subscribeTaskCenterTasks: mocks.subscribe,
}));

import { AnnotatorAtomsProvider } from "../src/components/annotator-atoms-provider";
import { AnnotatorHeader } from "../src/components/annotator-header";
import { AnnotatePageProvider } from "../src/state/annotate-page-context";

function AnnotatorShellFixture() {
  const [workspace] = createSignal("/experiments/annotator-demo");
  const [selection] = createSignal("position 7, site 12");
  const [edit, setEdit] = createSignal("unsaved cell outline");

  return (
    <div>
      <AnnotatorHeader />
      <output aria-label="Workspace state">{workspace()}</output>
      <output aria-label="Selection state">{selection()}</output>
      <input
        aria-label="Current edit"
        value={edit()}
        onInput={(event) => setEdit(event.currentTarget.value)}
      />
    </div>
  );
}

function renderAnnotatorShell() {
  return render(() => (
    <ShellThemeProvider appId="annotator">
      <ShellServerProvider probe={() => new Promise(() => undefined)}>
        <ShellWorkspaceProvider>
          <AnnotatorAtomsProvider>
            <AnnotatePageProvider>
              <AnnotatorShellFixture />
            </AnnotatePageProvider>
          </AnnotatorAtomsProvider>
        </ShellWorkspaceProvider>
      </ShellServerProvider>
    </ShellThemeProvider>
  ));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("AnnotatorHeader Task Center", () => {
  it("inspects and controls a crop task without losing workspace, selection, or edit state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    renderAnnotatorShell();

    const trigger = screen.getByRole("button", { name: "Tasks, 1 active" });
    const themeToggle = screen.getByRole("button", { name: "Switch to dark theme" });
    const header = trigger.closest("header");

    expect(header).not.toBeNull();
    expect(themeToggle.parentElement).toBe(trigger.parentElement);
    expect(trigger.nextElementSibling).toBe(themeToggle);
    // A healthy or still-booting server shows no connection chrome.
    expect(screen.queryByText(/Connecting|Connected/)).toBeNull();

    const edit = screen.getByRole("textbox", { name: "Current edit" }) as HTMLInputElement;
    const workspaceState = screen.getByLabelText("Workspace state");
    const selectionState = screen.getByLabelText("Selection state");
    fireEvent.input(edit, { target: { value: "expanded unsaved outline" } });
    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Task Center" });

    fireEvent.click(screen.getByRole("button", { name: /Expand Crop ROI/ }));
    await screen.findByText("Current step");
    expect(mocks.getTask).toHaveBeenCalledWith("crop-task", expect.any(AbortSignal));
    expectAnnotatorState(edit, workspaceState, selectionState);

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() =>
      expect(mocks.gateway.cancelTask).toHaveBeenCalledWith("crop-task", expect.any(AbortSignal)),
    );
    const retry = await screen.findByRole("button", { name: "Retry" });
    expectAnnotatorState(edit, workspaceState, selectionState);

    fireEvent.click(retry);
    await waitFor(() =>
      expect(mocks.retryStep).toHaveBeenCalledWith("crop-position-7", expect.any(AbortSignal)),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).toBeNull());
    expectAnnotatorState(edit, workspaceState, selectionState);

    fireEvent.pointerDown(screen.getByTestId("task-center-overlay"));
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expectAnnotatorState(edit, workspaceState, selectionState);
  });
});

function expectAnnotatorState(
  edit: HTMLInputElement,
  workspaceState: HTMLElement,
  selectionState: HTMLElement,
) {
  expect(workspaceState.textContent).toBe("/experiments/annotator-demo");
  expect(selectionState.textContent).toBe("position 7, site 12");
  expect(edit.value).toBe("expanded unsaved outline");
}
