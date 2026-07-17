import { Effect } from "effect";
import { TaskCommandError } from "@lisca/contracts/http-api";

import { createApiClient, type ApiClientDeps, type LiscaApiClient } from "../infra/api-client";
import { withOptionalAbortSignal } from "../infra/with-abort-signal";
import { toClientError } from "../infra/client-error";
import { withClientEffect } from "../infra/with-client-effect";
import type { TaskDataPort } from "./types";

export type { TaskDataPort } from "./types";

export type TaskPortDeps = ApiClientDeps;

function withTaskCommandEffect<A, E>(
  client: LiscaApiClient,
  signal: AbortSignal | undefined,
  run: (client: LiscaApiClient) => Effect.Effect<A, E>,
) {
  return withOptionalAbortSignal(
    Effect.mapError(run(client), (error) =>
      error instanceof TaskCommandError ? error : toClientError(error),
    ),
    signal,
  );
}

export function createTaskPort(
  deps: TaskPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): TaskDataPort {
  return {
    listOperations(signal) {
      return withClientEffect(client, signal, (c) => c.tasks.listOperations());
    },
    getOperation(operationId, signal) {
      return withClientEffect(client, signal, (c) =>
        c.tasks.getOperation({ urlParams: { operationId } }),
      );
    },
    getTask(taskId, signal) {
      return withClientEffect(client, signal, (c) => c.tasks.getTask({ urlParams: { taskId } }));
    },
    cancelOperation(operationId, signal) {
      return withTaskCommandEffect(client, signal, (c) =>
        c.tasks.cancelOperation({ payload: { operationId } }),
      );
    },
    cancelTask(taskId, signal) {
      return withTaskCommandEffect(client, signal, (c) =>
        c.tasks.cancelTask({ payload: { taskId } }),
      );
    },
    retryTask(taskId, signal) {
      return withTaskCommandEffect(client, signal, (c) =>
        c.tasks.retryTask({ payload: { taskId } }),
      );
    },
  };
}
