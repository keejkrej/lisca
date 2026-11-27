import { Html } from "@effect/ui/html";
import type { StepAttempt, StepDetail, TaskDetail, TaskSummary } from "@lisca/contracts";
import type { TaskCenterGateway } from "@lisca/utils";
import { Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { TaskCenter, TaskCenterPort } from "../src/task-center/task-center";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  keyDownElement,
  mountTest,
  setInputValue,
  waitForCondition,
} from "./render-helper";

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

async function mountTaskCenter(
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
    dismissTask: async () => detail("failed", 2),
    cancelStep: async () => detail("completed", 2),
    retryStep: async () => detail("running", 2),
    ...gatewayOverrides,
  };

  const Host = Html.component({
    name: "TaskCenterTestHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: {},
    view: (h) =>
      h.div.children(
        h.button.attr("type", "button").children("Underlying workflow"),
        h.input.attr("aria-label", "Current edit"),
        TaskCenter(h, {
          appearance,
          description: copy?.description,
          emptyMessage: copy?.emptyMessage,
          emptyTitle: copy?.emptyTitle,
          label: copy?.label,
          title: copy?.title,
        }),
      ),
  });

  const view = await mountTest(
    Host,
    {},
    {
      layer: Layer.succeed(TaskCenterPort, {
        gateway,
        subscribe: (next) => {
          handlers = next;
          return () => undefined;
        },
      }),
    },
  );
  await flushMicrotasks();

  return {
    ...view,
    gateway,
    snapshot: async (value: readonly TaskSummary[]) => {
      handlers!.onSnapshot(value);
      await flushMicrotasks();
    },
  };
}

function findButton(matcher: string | RegExp): HTMLButtonElement | null {
  for (const btn of document.body.querySelectorAll("button")) {
    const label = btn.getAttribute("aria-label") ?? "";
    const text = btn.textContent?.trim() ?? "";
    if (typeof matcher === "string") {
      if (label === matcher || text === matcher) return btn as HTMLButtonElement;
    } else if (matcher.test(label) || matcher.test(text)) {
      return btn as HTMLButtonElement;
    }
  }
  return null;
}

function findDialog(title: string): HTMLElement | null {
  for (const dialog of document.body.querySelectorAll('[role="dialog"]')) {
    const labelledBy = dialog.getAttribute("aria-labelledby");
    const heading = labelledBy ? document.getElementById(labelledBy) : null;
    if (heading?.textContent?.trim() === title) return dialog as HTMLElement;
    const h2 = dialog.querySelector("h2");
    if (h2?.textContent?.trim() === title) return dialog as HTMLElement;
  }
  return null;
}

function findProgressbar(matcher: string | RegExp): HTMLElement | null {
  for (const bar of document.body.querySelectorAll('[role="progressbar"]')) {
    const label = bar.getAttribute("aria-label") ?? "";
    if (typeof matcher === "string" ? label === matcher : matcher.test(label)) {
      return bar as HTMLElement;
    }
  }
  return null;
}

afterEach(async () => {
  await cleanupMounted();
  history.replaceState(null, "", "/");
});

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });

describe("Task Center dialog", () => {
  it("uses shared task-center copy unless the caller supplies page copy", async () => {
    await mountTaskCenter();
    clickElement(findButton("Tasks, 0 active")!);
    expect(await waitForCondition(() => findDialog("Task Center"))).toBeTruthy();
    expect(document.body.textContent).toContain(
      "Background computations and recent results. Click a task to expand its steps.",
    );
    expect(document.body.textContent).toContain("No tasks yet");
    expect(document.body.textContent).toContain("Long-running computations will appear here.");
    expect(document.body.textContent).not.toMatch(/while you keep working/);
    await cleanupMounted();

    await mountTaskCenter({}, undefined, {
      label: "Cropping",
      title: "Cropping",
      description: "Background crop computations",
      emptyTitle: "No crop tasks yet",
      emptyMessage: "Long-running crop computations will appear here.",
    });
    clickElement(findButton("Cropping, 0 active")!);
    expect(await waitForCondition(() => findDialog("Cropping"))).toBeTruthy();
    expect(document.body.textContent).toContain("Background crop computations");
    expect(document.body.textContent).toContain("No crop tasks yet");
    expect(document.body.textContent).toContain("Long-running crop computations will appear here.");
  });

  it("offers an opt-in quiet status link with a running-task badge", async () => {
    const view = await mountTaskCenter({}, "status-link");
    const trigger = findButton("Tasks, 0 active")!;

    expect(trigger.dataset.taskCenterAppearance).toBe("status-link");
    expect(trigger.className).toContain("z-button-variant-outline");
    expect(trigger.textContent).toBe("Tasks");
    expect(trigger.querySelector('[data-slot="task-badge"]')).toBeNull();

    await view.snapshot([summary("running", 1)]);

    expect(trigger.textContent).toBe("Tasks1");
    expect(trigger.querySelector('[data-slot="task-badge"]')?.textContent).toBe("1");

    await view.snapshot([summary("completed", 2)]);

    expect(trigger.textContent).toBe("Tasks");
    expect(trigger.querySelector('[data-slot="task-badge"]')).toBeNull();
  });

  it("opens modally and closes via close button, Escape, and backdrop dismiss while preserving edits", async () => {
    history.replaceState(null, "", "/align?position=7");
    const originalUrl = location.href;
    await mountTaskCenter();
    const trigger = findButton("Tasks, 0 active")!;
    const currentEdit = document.body.querySelector(
      'input[aria-label="Current edit"]',
    ) as HTMLInputElement;

    setInputValue(currentEdit, "position 7 annotation");

    trigger.focus();
    clickElement(trigger);
    await waitForCondition(() => findDialog("Task Center"));
    clickElement(findButton("Close Task Center")!);
    await waitForCondition(() => findDialog("Task Center") === null);
    expect(currentEdit.value).toBe("position 7 annotation");

    clickElement(trigger);
    await waitForCondition(() => findDialog("Task Center"));
    keyDownElement(document, "Escape");
    await waitForCondition(() => findDialog("Task Center") === null);
    expect(currentEdit.value).toBe("position 7 annotation");

    clickElement(trigger);
    await waitForCondition(() => findDialog("Task Center"));
    const backdrop = document.body.querySelector('[data-testid="task-center-overlay"]')!;
    clickElement(backdrop);
    await waitForCondition(() => findDialog("Task Center") === null);
    expect(currentEdit.value).toBe("position 7 annotation");
    expect(location.href).toBe(originalUrl);
  });

  it("refreshes expanded and reopened detail while ignoring an older GET response", async () => {
    const first = deferred<TaskDetail>();
    const second = deferred<TaskDetail>();
    const third = deferred<TaskDetail>();
    const responses = [first, second, third];
    const getTask = vi.fn(() => responses.shift()!.promise);
    const view = await mountTaskCenter({ getTask });
    await view.snapshot([summary("running", 1)]);

    clickElement(findButton("Tasks, 1 active")!);
    await waitForCondition(() => findButton(/Expand Crop ROI/));
    clickElement(findButton(/Expand Crop ROI/)!);
    await view.snapshot([summary("completed", 2)]);
    second.resolve(detail("completed", 2));
    await waitForCondition(() => document.body.textContent?.includes("Pos4"));
    first.resolve(detail("running", 1));
    await flushMicrotasks();
    expect(findButton(/Collapse Crop ROI, Completed/)).toBeTruthy();

    clickElement(findButton(/Collapse Crop ROI/)!);
    await flushMicrotasks();
    clickElement(findButton(/Expand Crop ROI/)!);
    third.resolve(detail("failed", 3));
    expect(
      await waitForCondition(() => findButton(/Expand Crop ROI, Failed|Collapse Crop ROI, Failed/)),
    ).toBeTruthy();
  });

  it("labels killing stages and shows a frame bar on the running position", async () => {
    const base = detail("running", 1);
    const killing: TaskDetail = {
      task: {
        ...base.task,
        kind: "analysis/killing",
        progress: {
          ...base.task.progress,
          total: 3,
          completed: 1,
          running: 1,
          queued: 1,
        },
      },
      steps: [
        {
          ...step("completed"),
          stepId: "prepare",
          stepKind: "analysis/killing/prepare",
          workProgress: null,
        },
        {
          ...step("running", [attempt("running")], runningWorkProgress(1)),
          stepId: "predict",
          stepKind: "analysis/killing/predict/Pos26",
          workProgress: {
            unit: "frame",
            completed: 400,
            total: 1600,
            phase: "predict",
            message: null,
            updatedAtMs: 1,
          },
        },
        {
          ...step("queued"),
          stepId: "merge",
          stepKind: "analysis/killing/merge-predictions",
          workProgress: null,
        },
      ],
    };
    const view = await mountTaskCenter({ getTask: async () => killing });
    await view.snapshot([killing.task]);
    clickElement(findButton("Tasks, 1 active")!);
    await waitForCondition(() => document.body.textContent?.includes("1/3 Steps"));
    clickElement(findButton(/Expand Analysis\/killing/)!);
    await waitForCondition(() => document.body.textContent?.includes("Prepare"));
    expect(document.body.textContent).toContain("Pos26");
    expect(document.body.textContent).toContain("Merge Predictions");
    expect(document.body.textContent).not.toContain("Current step");
    expect(findProgressbar("Pos26 frame progress")?.getAttribute("aria-valuenow")).toBe("400");
    expect(findProgressbar("Prepare progress")?.getAttribute("aria-valuenow")).toBe("1");
    expect(findProgressbar("Merge Predictions progress")?.getAttribute("aria-valuenow")).toBe("0");
  });

  it("hides per-position progress when collapsed and shows it on each step when expanded", async () => {
    const first = deferred<TaskDetail>();
    const second = deferred<TaskDetail>();
    const responses = [first, second];
    const getTask = vi.fn(() => responses.shift()!.promise);
    const view = await mountTaskCenter({ getTask });
    await view.snapshot([summary("running", 1)]);

    clickElement(findButton("Tasks, 1 active")!);
    await waitForCondition(() => findProgressbar(/steps completed/));
    expect(findProgressbar("Pos4 roiframe progress")).toBeNull();
    expect(findButton(/Expand Crop ROI, Running/)).toBeTruthy();

    clickElement(findButton(/Expand Crop ROI/)!);
    first.resolve(detail("running", 1, [attempt("running")]));
    const progressbar = await waitForCondition(() => findProgressbar("Pos4 roiframe progress"));
    expect(progressbar.getAttribute("aria-valuenow")).toBe("1200");
    const stopButtons = Array.from(document.body.querySelectorAll("button")).filter(
      (btn) => btn.textContent?.trim() === "Stop",
    );
    expect(stopButtons).toHaveLength(1);

    await view.snapshot([summary("failed", 2)]);
    await waitForCondition(() => getTask.mock.calls.length === 2);
    second.resolve(detail("failed", 2, [attempt("failed")]));

    await waitForCondition(() => document.body.textContent?.includes("Crop analysis failed"));
    expect(findButton("Retry")).toBeTruthy();
    expect(findButton("Stop")).toBeNull();
    expect(findButton("Dismiss")).toBeTruthy();
    expect(findButton(/Failed/)).toBeTruthy();
  });

  it("dismisses a failed crop so it leaves the Task Center", async () => {
    const dismissTask = vi.fn(async () => detail("failed", 2, [attempt("failed")]));
    const view = await mountTaskCenter({
      getTask: async () => detail("failed", 2, [attempt("failed")]),
      dismissTask,
    });
    await view.snapshot([summary("failed", 2)]);

    clickElement(findButton("Tasks, 1 need attention")!);
    await waitForCondition(() => findButton("Dismiss"));
    clickElement(findButton("Dismiss")!);
    await waitForCondition(() => dismissTask.mock.calls.length > 0);
    expect(dismissTask).toHaveBeenCalledWith("task-1", expect.any(AbortSignal));
    await waitForCondition(() => findButton(/Crop ROI/) === null);
  });
});
