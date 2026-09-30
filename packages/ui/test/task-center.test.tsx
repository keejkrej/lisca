import type { TaskDetail, TaskSummary, StepAttempt, StepDetail } from "@lisca/contracts";
import type { TaskCenterGateway } from "@lisca/utils";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { TaskCenter } from "../src/shell/task-center/task-center";

function summary(status: TaskSummary["status"], updatedAtMs: number): TaskSummary {
  return {
    taskId: "task-1",
    kind: "crop-roi",
    workspaceId: "workspace-1",
    workspacePath: "/workspace",
    mutating: true,
    status,
    attention: status === "failed" ? "error" : "none",
    progress: {
      total: 1,
      queued: status === "queued" ? 1 : 0,
      blocked: 0,
      running: status === "running" ? 1 : 0,
      completed: status === "completed" ? 1 : 0,
      failed: status === "failed" ? 1 : 0,
      cancelled: 0,
      cancellationRequested: 0,
    },
    activeStepKind: status === "running" ? "crop-roi/Pos4" : null,
    workProgress:
      status === "running"
        ? {
            unit: "roiframe",
            completed: 1200,
            total: 1800,
            phase: "writing",
            message: "Writing Pos4",
            updatedAtMs,
          }
        : null,
    createdAtMs: 1,
    updatedAtMs,
  };
}

function attempt(status: StepAttempt["status"]): StepAttempt {
  return {
    attemptId: "attempt-1",
    taskId: "task-1",
    stepId: "step-1",
    status,
    startedAtMs: 10,
    finishedAtMs: status === "running" ? null : 20,
    error: status === "failed" ? { code: "crop-failed", message: "Crop analysis failed" } : null,
  };
}

function step(
  status: StepDetail["status"],
  attempts: StepAttempt[] = [],
  workProgress: StepDetail["workProgress"] = null,
): StepDetail {
  return {
    stepId: "step-1",
    taskId: "task-1",
    stepKind: "crop-roi/Pos4",
    workspaceId: "workspace-1",
    status,
    weight: 1,
    enqueueOrder: 0,
    dependencies: [],
    blockedBy: [],
    attempts,
    workProgress,
  };
}

function runningWorkProgress(updatedAtMs: number): NonNullable<StepDetail["workProgress"]> {
  return {
    unit: "roiframe",
    completed: 1200,
    total: 1800,
    phase: "writing",
    message: "Writing Pos4",
    updatedAtMs,
  };
}

function detail(
  status: TaskSummary["status"],
  updatedAtMs: number,
  attempts: StepAttempt[] = [],
): TaskDetail {
  const stepStatus =
    status === "completed" ? "completed" : status === "failed" ? "failed" : "running";
  return {
    task: summary(status, updatedAtMs),
    steps: [
      step(
        stepStatus,
        attempts,
        stepStatus === "running" ? runningWorkProgress(updatedAtMs) : null,
      ),
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderTaskCenter(
  gatewayOverrides: Partial<TaskCenterGateway> = {},
  appearance?: "button" | "status-link",
  copy?: {
    label?: string;
    title?: string;
    description?: string;
    emptyTitle?: string;
    emptyMessage?: string;
  },
) {
  let handlers:
    | {
        onSnapshot: (snapshot: readonly TaskSummary[]) => void;
        onError: (error: unknown) => void;
      }
    | undefined;
  const gateway: TaskCenterGateway = {
    listTasks: async () => [],
    getTask: async () => detail("running", 1),
    getStep: async () => step("running"),
    cancelTask: async () => detail("completed", 2),
    cancelStep: async () => detail("completed", 2),
    retryStep: async () => detail("running", 2),
    ...gatewayOverrides,
  };
  const view = render(() => (
    <div>
      <button type="button">Underlying workflow</button>
      <input aria-label="Current edit" />
      <TaskCenter
        appearance={appearance}
        description={copy?.description}
        emptyMessage={copy?.emptyMessage}
        emptyTitle={copy?.emptyTitle}
        gateway={gateway}
        label={copy?.label}
        title={copy?.title}
        subscribe={(next) => {
          handlers = next;
          return () => undefined;
        }}
      />
    </div>
  ));
  return {
    ...view,
    gateway,
    snapshot: (value: readonly TaskSummary[]) => handlers!.onSnapshot(value),
  };
}

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("Task Center dialog", () => {
  it("uses shared task-center copy unless the caller supplies page copy", async () => {
    const generic = renderTaskCenter();
    fireEvent.click(generic.getByRole("button", { name: "Tasks, 0 active" }));
    expect(await screen.findByRole("dialog", { name: "Task Center" })).toBeTruthy();
    expect(screen.getByText("Background computations and recent results")).toBeTruthy();
    expect(screen.getByText("No tasks yet")).toBeTruthy();
    expect(screen.getByText("Long-running computations will appear here.")).toBeTruthy();
    expect(screen.queryByText(/while you keep working/)).toBeNull();
    cleanup();

    const scoped = renderTaskCenter({}, undefined, {
      label: "Cropping",
      title: "Cropping",
      description: "Background crop computations",
      emptyTitle: "No crop tasks yet",
      emptyMessage: "Long-running crop computations will appear here.",
    });
    fireEvent.click(scoped.getByRole("button", { name: "Cropping, 0 active" }));
    expect(await screen.findByRole("dialog", { name: "Cropping" })).toBeTruthy();
    expect(screen.getByText("Background crop computations")).toBeTruthy();
    expect(screen.getByText("No crop tasks yet")).toBeTruthy();
    expect(screen.getByText("Long-running crop computations will appear here.")).toBeTruthy();
  });

  it("offers an opt-in quiet status link with a running-task badge", () => {
    const view = renderTaskCenter({}, "status-link");
    const trigger = view.getByRole("button", { name: "Tasks, 0 active" });

    expect(trigger.dataset.taskCenterAppearance).toBe("status-link");
    expect(trigger.textContent).toBe("Tasks");
    expect(trigger.querySelector('[data-slot="task-badge"]')).toBeNull();

    view.snapshot([summary("running", 1)]);

    expect(trigger.textContent).toBe("Tasks1");
    expect(trigger.querySelector('[data-slot="task-badge"]')?.textContent).toBe("1");

    view.snapshot([summary("completed", 2)]);

    expect(trigger.textContent).toBe("Tasks");
    expect(trigger.querySelector('[data-slot="task-badge"]')).toBeNull();
  });

  it("opens modally and restores trigger focus after close, Escape, and backdrop dismiss", async () => {
    history.replaceState(null, "", "/align?position=7");
    const originalUrl = location.href;
    const view = renderTaskCenter();
    const trigger = view.getByRole("button", { name: "Tasks, 0 active" });
    const underlyingWorkflow = view.getByRole("button", { name: "Underlying workflow" });
    const currentEdit = view.getByRole("textbox", { name: "Current edit" });

    fireEvent.input(currentEdit, { target: { value: "position 7 annotation" } });

    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Task Center" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close Task Center" }));
    expect(underlyingWorkflow.closest("[aria-hidden=true]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close Task Center" }));
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(underlyingWorkflow.closest("[aria-hidden=true]")).toBeNull();
    expect((currentEdit as HTMLInputElement).value).toBe("position 7 annotation");

    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Task Center" });
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect((currentEdit as HTMLInputElement).value).toBe("position 7 annotation");

    fireEvent.click(trigger);
    await screen.findByRole("dialog", { name: "Task Center" });
    fireEvent.pointerDown(screen.getByTestId("task-center-overlay"));
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect((currentEdit as HTMLInputElement).value).toBe("position 7 annotation");
    expect(location.href).toBe(originalUrl);
  });

  it("refreshes expanded and reopened detail while ignoring an older GET response", async () => {
    const first = deferred<TaskDetail>();
    const second = deferred<TaskDetail>();
    const third = deferred<TaskDetail>();
    const responses = [first, second, third];
    const getTask = vi.fn(() => responses.shift()!.promise);
    const view = renderTaskCenter({ getTask });
    view.snapshot([summary("running", 1)]);

    fireEvent.click(view.getByRole("button", { name: "Tasks, 1 active" }));
    fireEvent.click(screen.getByRole("button", { name: /Expand Crop ROI/ }));
    view.snapshot([summary("completed", 2)]);
    second.resolve(detail("completed", 2));
    await screen.findByText("Pos4");
    first.resolve(detail("running", 1));
    await Promise.resolve();
    expect(screen.getByRole("button", { name: /Collapse Crop ROI, Completed/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Collapse Crop ROI/ }));
    fireEvent.click(screen.getByRole("button", { name: /Expand Crop ROI/ }));
    third.resolve(detail("failed", 3));
    expect(
      await screen.findByRole("button", {
        name: /Expand Crop ROI, Failed|Collapse Crop ROI, Failed/,
      }),
    ).toBeTruthy();
  });

  it("hides per-position progress when collapsed and shows it on each step when expanded", async () => {
    const first = deferred<TaskDetail>();
    const second = deferred<TaskDetail>();
    const responses = [first, second];
    const getTask = vi.fn(() => responses.shift()!.promise);
    const view = renderTaskCenter({ getTask });
    view.snapshot([summary("running", 1)]);

    fireEvent.click(view.getByRole("button", { name: "Tasks, 1 active" }));
    expect(screen.queryByRole("progressbar", { name: "Pos4 roiframe progress" })).toBeNull();
    expect(screen.getByRole("progressbar", { name: /steps completed/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Expand Crop ROI, Running/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Expand Crop ROI/ }));
    first.resolve(detail("running", 1, [attempt("running")]));
    await screen.findByRole("progressbar", { name: "Pos4 roiframe progress" });
    expect(
      screen
        .getByRole("progressbar", { name: "Pos4 roiframe progress" })
        .getAttribute("aria-valuenow"),
    ).toBe("1200");
    expect(screen.getAllByRole("button", { name: "Stop" })).toHaveLength(1);

    view.snapshot([summary("failed", 2)]);
    await waitFor(() => expect(getTask).toHaveBeenCalledTimes(2));
    second.resolve(detail("failed", 2, [attempt("failed")]));

    await screen.findByText(/Crop analysis failed/);
    expect(screen.getByText(/Crop analysis failed/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    expect(screen.getByRole("button", { name: /Failed/ })).toBeTruthy();
  });
});
