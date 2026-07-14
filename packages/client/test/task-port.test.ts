import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { createTaskPort } from "../src/ports/tasks";
import { TaskCommandError } from "@lisca/contracts/http-api";

const operation = {
  operationId: "op-1",
  kind: "test-operation",
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

describe("createTaskPort", () => {
  it("reads and decodes the generic operation list", async () => {
    const requested: string[] = [];
    const port = createTaskPort({
      baseUrl: () => "http://127.0.0.1:8765",
      fetch: async (input) => {
        requested.push(String(input));
        return Response.json([operation]);
      },
    });

    const result = await Effect.runPromise(port.listOperations());
    expect(result).toEqual([operation]);
    expect(requested[0]).toContain("/tasks/operations");
  });

  it("uses stable IDs for operation and task detail reads", async () => {
    const requested: string[] = [];
    const task = {
      taskId: "task-1",
      operationId: "op-1",
      taskKind: "test-task",
      workspaceId: "workspace-1",
      status: "running",
      weight: 1,
      enqueueOrder: 0,
      dependencies: [],
      blockedBy: [],
      attempts: [],
    } as const;
    const port = createTaskPort({
      baseUrl: () => "http://127.0.0.1:8765",
      fetch: async (input) => {
        const url = String(input);
        requested.push(url);
        return Response.json(url.includes("/tasks/task") ? task : { operation, tasks: [task] });
      },
    });

    await expect(Effect.runPromise(port.getOperation("op-1"))).resolves.toEqual({
      operation,
      tasks: [task],
    });
    await expect(Effect.runPromise(port.getTask("task-1"))).resolves.toEqual(task);
    expect(requested[0]).toContain("operationId=op-1");
    expect(requested[1]).toContain("taskId=task-1");
  });

  it("sends typed lifecycle commands and returns the canonical operation detail", async () => {
    const requested: Array<{ url: string; method: string; body: unknown }> = [];
    const task = {
      taskId: "task-1",
      operationId: "op-1",
      taskKind: "test-task",
      workspaceId: "workspace-1",
      status: "cancelled",
      weight: 1,
      enqueueOrder: 0,
      dependencies: [],
      blockedBy: [],
      attempts: [],
    } as const;
    const detail = {
      operation: {
        ...operation,
        status: "cancelled" as const,
        progress: { ...operation.progress, running: 0, cancelled: 1 },
      },
      tasks: [task],
    };
    const port = createTaskPort({
      baseUrl: () => "http://127.0.0.1:8765",
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

    await expect(Effect.runPromise(port.cancelOperation("op-1"))).resolves.toEqual(detail);
    await expect(Effect.runPromise(port.cancelTask("task-1"))).resolves.toEqual(detail);
    await expect(Effect.runPromise(port.retryTask("task-1"))).resolves.toEqual(detail);
    expect(requested).toEqual([
      {
        url: "http://127.0.0.1:8765/tasks/operation/cancel",
        method: "POST",
        body: { operationId: "op-1" },
      },
      {
        url: "http://127.0.0.1:8765/tasks/task/cancel",
        method: "POST",
        body: { taskId: "task-1" },
      },
      {
        url: "http://127.0.0.1:8765/tasks/task/retry",
        method: "POST",
        body: { taskId: "task-1" },
      },
    ]);
  });

  it("preserves typed invalid-transition command failures", async () => {
    const port = createTaskPort({
      baseUrl: () => "http://127.0.0.1:8765",
      fetch: async () =>
        Response.json(
          {
            _tag: "TaskCommandError",
            code: "invalid-transition",
            entity: "task",
            id: "task-1",
            currentStatus: "running",
            message: "cannot retry task task-1 while it is running",
          },
          { status: 409 },
        ),
    });

    const error = await Effect.runPromise(Effect.flip(port.retryTask("task-1")));
    expect(error).toBeInstanceOf(TaskCommandError);
    expect(error).toMatchObject({
      _tag: "TaskCommandError",
      code: "invalid-transition",
      currentStatus: "running",
    });
  });
});
