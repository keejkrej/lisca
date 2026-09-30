import type { TaskCenterGateway } from "@lisca/utils";

import { runClientEffect } from "../infra/runtime";
import type { TaskDataPort } from "../ports/types";

export function createTaskCenterGateway(port: TaskDataPort): TaskCenterGateway {
  return {
    listTasks: (signal) => runClientEffect(port.listTasks(), signal ? { signal } : undefined),
    getTask: (taskId, signal) =>
      runClientEffect(port.getTask(taskId), signal ? { signal } : undefined),
    getStep: (stepId, signal) =>
      runClientEffect(port.getStep(stepId), signal ? { signal } : undefined),
    cancelTask: (taskId, signal) =>
      runClientEffect(port.cancelTask(taskId), signal ? { signal } : undefined),
    cancelStep: (stepId, signal) =>
      runClientEffect(port.cancelStep(stepId), signal ? { signal } : undefined),
    retryStep: (stepId, signal) =>
      runClientEffect(port.retryStep(stepId), signal ? { signal } : undefined),
  };
}

export type TaskCenterPollingOptions = {
  gateway: Pick<TaskCenterGateway, "listTasks">;
  onSnapshot: (snapshot: Awaited<ReturnType<TaskCenterGateway["listTasks"]>>) => void;
  onError: (error: unknown) => void;
  pollIntervalMs?: number;
};

/**
 * Poll the canonical task list without overlapping requests. Errors leave the last good
 * snapshot intact and polling continues so a short server interruption can recover in place.
 */
export function subscribeTaskCenterTasks(options: TaskCenterPollingOptions): () => void {
  const pollIntervalMs = options.pollIntervalMs ?? 1_500;
  const abortController = new AbortController();
  let stopped = false;
  let handle: ReturnType<typeof setTimeout> | undefined;

  const scheduleNext = () => {
    if (stopped) return;
    handle = globalThis.setTimeout(() => void poll(), pollIntervalMs);
  };

  const poll = async () => {
    try {
      const snapshot = await options.gateway.listTasks(abortController.signal);
      if (!stopped) options.onSnapshot(snapshot);
    } catch (error) {
      if (!stopped && !abortController.signal.aborted) options.onError(error);
    } finally {
      scheduleNext();
    }
  };

  void poll();

  return () => {
    stopped = true;
    abortController.abort();
    if (handle !== undefined) globalThis.clearTimeout(handle);
  };
}
