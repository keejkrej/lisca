import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createTaskPort } from "../src/ports/tasks";
import { runClientEffect } from "../src/infra/runtime";
import { TaskCommandError } from "@lisca/contracts/http-api";

const task = {
  taskId: "task-1",
  kind: "test-task",
  workspaceId: "workspace-1",
  workspacePath: "/workspace",
  mutating: true,
  status: "running",
  attention: "none",
  progress: {
    total: 1,
    queued: 0,
    blocked: 0,
    running: 1,
    completed: 0,
    failed: 0,
    cancelled: 0,
    cancellationRequested: 0,
  },
  createdAtMs: 1,
  updatedAtMs: 2,
} as const;

// Requests are origin-relative; a browser page resolves them against its own location.
beforeEach(() => {
  vi.stubGlobal("location", { origin: "http://localhost:8765", pathname: "/" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createTaskPort", () => {
  it("reads and decodes the generic task list", async () => {
    const requested: string[] = [];
    const port = createTaskPort({
      fetch: async (input) => {
        requested.push(String(input));
        return Response.json([task]);
      },
    });

    const result = await Effect.runPromise(port.listTasks());
    expect(result).toEqual([task]);
    expect(requested[0]).toContain("/tasks");
  });

  it("uses stable IDs for task and step detail reads", async () => {
    const requested: string[] = [];
    const step = {
      stepId: "step-1",
      taskId: "task-1",
      stepKind: "test-step",
      workspaceId: "workspace-1",
      status: "running",
      weight: 1,
      enqueueOrder: 0,
      dependencies: [],
      blockedBy: [],
      attempts: [],
    } as const;
    const port = createTaskPort({
      fetch: async (input) => {
        const url = String(input);
        requested.push(url);
        return Response.json(url.includes("/tasks/step") ? step : { task, steps: [step] });
      },
    });

    await expect(Effect.runPromise(port.getTask("task-1"))).resolves.toEqual({
      task,
      steps: [step],
    });
    await expect(Effect.runPromise(port.getStep("step-1"))).resolves.toEqual(step);
    expect(requested[0]).toContain("taskId=task-1");
    expect(requested[1]).toContain("stepId=step-1");
  });

  it("sends typed lifecycle commands and returns the canonical task detail", async () => {
    const requested: Array<{ url: string; method: string; body: unknown }> = [];
    const step = {
      stepId: "step-1",
      taskId: "task-1",
      stepKind: "test-step",
      workspaceId: "workspace-1",
      status: "cancelled",
      weight: 1,
      enqueueOrder: 0,
      dependencies: [],
      blockedBy: [],
      attempts: [],
    } as const;
    const detail = {
      task: {
        ...task,
        status: "cancelled" as const,
        progress: { ...task.progress, running: 0, cancelled: 1 },
      },
      steps: [step],
    };
    const port = createTaskPort({
      fetch: async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        requested.push({
          url: request.url,
          method: request.method,
          body: await request.clone().json(),
        });
        return Response.json(detail);
      },
    });

    await expect(Effect.runPromise(port.cancelTask("task-1"))).resolves.toEqual(detail);
    await expect(Effect.runPromise(port.cancelStep("step-1"))).resolves.toEqual(detail);
    await expect(Effect.runPromise(port.retryStep("step-1"))).resolves.toEqual(detail);
    expect(requested).toEqual([
      {
        url: "http://localhost:8765/tasks/task/cancel",
        method: "POST",
        body: { taskId: "task-1" },
      },
      {
        url: "http://localhost:8765/tasks/step/cancel",
        method: "POST",
        body: { stepId: "step-1" },
      },
      {
        url: "http://localhost:8765/tasks/step/retry",
        method: "POST",
        body: { stepId: "step-1" },
      },
    ]);
  });

  it("preserves typed invalid-transition command failures", async () => {
    const port = createTaskPort({
      fetch: async () =>
        Response.json(
          {
            _tag: "TaskCommandError",
            code: "invalid-transition",
            entity: "step",
            id: "step-1",
            currentStatus: "running",
            message: "cannot retry step step-1 while it is running",
          },
          { status: 409 },
        ),
    });

    const error = await runClientEffect(port.retryStep("step-1")).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(TaskCommandError);
    expect(error).toMatchObject({
      _tag: "TaskCommandError",
      code: "invalid-transition",
      currentStatus: "running",
    });
  });
});
