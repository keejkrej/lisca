import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { ShellServerProvider, ShellThemeProvider, ShellWorkspaceProvider } from "@lisca/ui/shell";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const operation = (status: "running" | "cancelled", updatedAtMs: number) => ({
    operationId: "crop-operation",
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
      <ShellServerProvider
        appId="annotator"
        defaultPort={8766}
        probe={() => new Promise(() => undefined)}
      >
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
    expect(trigger.previousElementSibling?.textContent).toContain("Connecting…");

    const edit = screen.getByRole("textbox", { name: "Current edit" }) as HTMLInputElement;
    const workspaceState = screen.getByLabelText("Workspace state");
    const selectionState = screen.getByLabelText("Selection state");
    fireEvent.input(edit, { target: { value: "expanded unsaved outline" } });
    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Task Center" });

    fireEvent.click(screen.getByRole("button", { name: /Expand Crop ROI/ }));
    await screen.findByText("Current task");
    expect(mocks.getOperation).toHaveBeenCalledWith("crop-operation", expect.any(AbortSignal));
    expectAnnotatorState(edit, workspaceState, selectionState);

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() =>
      expect(mocks.gateway.cancelOperation).toHaveBeenCalledWith(
        "crop-operation",
        expect.any(AbortSignal),
      ),
    );
    const retry = await screen.findByRole("button", { name: "Retry" });
    expectAnnotatorState(edit, workspaceState, selectionState);

    fireEvent.click(retry);
    await waitFor(() =>
      expect(mocks.retryTask).toHaveBeenCalledWith("crop-position-7", expect.any(AbortSignal)),
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
