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
  deps: TaskPortDeps = {},
  client: LiscaApiClient = createApiClient(deps),
): TaskDataPort {
  return {
    listTasks() {
      return toClientEffect(client.tasks.listTasks());
    },
    getTask(taskId) {
      return toClientEffect(client.tasks.getTask({ query: { taskId } }));
    },
    getStep(stepId) {
      return toClientEffect(client.tasks.getStep({ query: { stepId } }));
    },
    cancelTask(taskId) {
      return toTaskCommandEffect(client.tasks.cancelTask({ payload: { taskId } }));
    },
    cancelStep(stepId) {
      return toTaskCommandEffect(client.tasks.cancelStep({ payload: { stepId } }));
    },
    retryStep(stepId) {
      return toTaskCommandEffect(client.tasks.retryStep({ payload: { stepId } }));
    },
  };
}
