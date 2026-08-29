import { TaskCommandError } from "@lisca/contracts/http-api";
import { Effect } from "effect";

import {
  createApiClient,
  toClientEffect,
  type ApiClientDeps,
  type LiscaApiClient,
} from "../infra/api-client";
import { toClientError } from "../infra/client-error";
import type { TaskDataPort } from "./types";

export type { TaskDataPort } from "./types";

export type TaskPortDeps = ApiClientDeps;

function toTaskCommandEffect<A, E>(effect: Effect.Effect<A, E>) {
  return Effect.mapError(effect, (error) =>
    error instanceof TaskCommandError ? error : toClientError(error),
  );
}

export function createTaskPort(
  deps: TaskPortDeps,
  client: LiscaApiClient = createApiClient(deps),
): TaskDataPort {
  return {
    listOperations() {
      return toClientEffect(client.tasks.listOperations());
    },
    getOperation(operationId) {
      return toClientEffect(client.tasks.getOperation({ query: { operationId } }));
    },
    getTask(taskId) {
      return toClientEffect(client.tasks.getTask({ query: { taskId } }));
    },
    cancelOperation(operationId) {
      return toTaskCommandEffect(client.tasks.cancelOperation({ payload: { operationId } }));
    },
    cancelTask(taskId) {
      return toTaskCommandEffect(client.tasks.cancelTask({ payload: { taskId } }));
    },
    retryTask(taskId) {
      return toTaskCommandEffect(client.tasks.retryTask({ payload: { taskId } }));
    },
  };
}
