import type {
  OperationDetail,
  OperationSummary,
  TaskAttempt,
  TaskDetail,
} from "@lisca/contracts";
import type { TaskCenterGateway } from "@lisca/ui-headless/task-center";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskCenter } from "../src/shell/task-center/task-center";

function summary(status: OperationSummary["status"], updatedAtMs: number): OperationSummary {
  return {
    operationId: "operation-1",
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
    createdAtMs: 1,
    updatedAtMs,
  };
}

function attempt(status: TaskAttempt["status"]): TaskAttempt {
  return {
    attemptId: "attempt-1",
    operationId: "operation-1",
    taskId: "task-1",
    status,
    startedAtMs: 10,
    finishedAtMs: status === "running" ? null : 20,
    error:
      status === "failed"
        ? { code: "crop-failed", message: "Crop analysis failed" }
        : null,
  };
}

function task(status: TaskDetail["status"], attempts: TaskAttempt[] = []): TaskDetail {
  return {
    taskId: "task-1",
    operationId: "operation-1",
    taskKind: "crop-position-1",
    workspaceId: "workspace-1",
    status,
    weight: 1,
    enqueueOrder: 0,
    dependencies: [],
    blockedBy: [],
    attempts,
  };
}

function detail(
  status: OperationSummary["status"],
  updatedAtMs: number,
  attempts: TaskAttempt[] = [],
): OperationDetail {
  const taskStatus = status === "completed" ? "completed" : status === "failed" ? "failed" : "running";
  return {
    operation: summary(status, updatedAtMs),
    tasks: [task(taskStatus, attempts)],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderTaskCenter(gatewayOverrides: Partial<TaskCenterGateway> = {}) {
  let handlers:
    | {
        onSnapshot: (snapshot: readonly OperationSummary[]) => void;
        onError: (error: unknown) => void;
      }
    | undefined;
  const gateway: TaskCenterGateway = {
    listOperations: async () => [],
    getOperation: async () => detail("running", 1),
    getTask: async () => task("running"),
    cancelOperation: async () => detail("completed", 2),
    cancelTask: async () => detail("completed", 2),
    retryTask: async () => detail("running", 2),
    ...gatewayOverrides,
  };
  const view = render(() => (
    <div>
      <button type="button">Underlying workflow</button>
      <input aria-label="Current edit" />
      <TaskCenter
        gateway={gateway}
        subscribe={(next) => {
          handlers = next;
          return () => undefined;
        }}
      />
    </div>
  ));
  return { ...view, gateway, snapshot: (value: readonly OperationSummary[]) => handlers!.onSnapshot(value) };
}

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("Task Center dialog", () => {
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
    const first = deferred<OperationDetail>();
    const second = deferred<OperationDetail>();
    const third = deferred<OperationDetail>();
    const responses = [first, second, third];
    const getOperation = vi.fn(() => responses.shift()!.promise);
    const view = renderTaskCenter({ getOperation });
    view.snapshot([summary("running", 1)]);

    fireEvent.click(view.getByRole("button", { name: "Tasks, 1 active" }));
    fireEvent.click(screen.getByRole("button", { name: /Crop ROI/ }));
    view.snapshot([summary("completed", 2)]);
    second.resolve(detail("completed", 2));
    await screen.findByRole("button", { name: /Crop Position 1.*Completed/ });
    first.resolve(detail("running", 1));
    await Promise.resolve();
    expect(screen.getByRole("button", { name: /Crop Position 1.*Completed/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Crop ROI/ }));
    fireEvent.click(screen.getByRole("button", { name: /Crop ROI/ }));
    third.resolve(detail("failed", 3));
    await screen.findByRole("button", { name: /Crop Position 1.*Failed/ });
  });

  it("refreshes already-loaded task, attempt, and action rows after a newer snapshot", async () => {
    const first = deferred<OperationDetail>();
    const second = deferred<OperationDetail>();
    const responses = [first, second];
    const getOperation = vi.fn(() => responses.shift()!.promise);
    const view = renderTaskCenter({ getOperation });
    view.snapshot([summary("running", 1)]);

    fireEvent.click(view.getByRole("button", { name: "Tasks, 1 active" }));
    fireEvent.click(screen.getByRole("button", { name: /Crop ROI/ }));
    first.resolve(detail("running", 1, [attempt("running")]));
    const taskRow = await screen.findByRole("button", { name: /Crop Position 1.*Running/ });
    fireEvent.click(taskRow);
    expect(screen.getByText("Attempts (1)")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Stop" })).toHaveLength(2);

    view.snapshot([summary("failed", 2)]);
    await waitFor(() => expect(getOperation).toHaveBeenCalledTimes(2));
    second.resolve(detail("failed", 2, [attempt("failed")]));

    await screen.findByRole("button", { name: /Crop Position 1.*Failed/ });
    expect(screen.getByText("Crop analysis failed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });
});
