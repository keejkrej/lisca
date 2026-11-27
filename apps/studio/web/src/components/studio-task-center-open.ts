import { Subscription } from "@effect/ui";
import { Effect, Queue, Stream } from "effect";

import type { StudioTaskScope } from "./studio-task-scope";

let openScope: StudioTaskScope | null = null;
let requestedAt = 0;
const listeners = new Set<(scope: StudioTaskScope | null) => void>();

function notify(): void {
  for (const listener of listeners) {
    listener(openScope);
  }
}

/**
 * Route changes and the dialog's first focus pass both dismiss a modal that
 * opens in the same turn. Hold the request across that window so Annotate and
 * Analysis can show the dialog the handoff asked for.
 */
export const STUDIO_TASK_CENTER_OPEN_HOLD_MS = 600;

export function openStudioTaskCenter(scope: StudioTaskScope): void {
  requestedAt = Date.now();
  openScope = scope;
  notify();
}

export function studioTaskCenterOpenScope(): StudioTaskScope | null {
  return openScope;
}

export function studioTaskCenterRequestedAt(): number {
  return requestedAt;
}

export function studioTaskCenterOpenIsHeld(openedAt: number, now: number): boolean {
  return openedAt > 0 && now - openedAt < STUDIO_TASK_CENTER_OPEN_HOLD_MS;
}

export function clearStudioTaskCenterOpen(): void {
  openScope = null;
  requestedAt = 0;
  notify();
}

export function subscribeStudioTaskCenterOpen(
  listener: (scope: StudioTaskScope | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function studioTaskCenterOpenSubscription<M>(
  key: string,
  toMessage: (scope: StudioTaskScope | null) => M,
) {
  return Subscription.make(key, "task-center-open", () =>
    Stream.callback<M>((queue) => {
      const stop = subscribeStudioTaskCenterOpen((scope) => {
        Queue.offerUnsafe(queue, toMessage(scope));
      });
      return Effect.addFinalizer(() => Effect.sync(stop));
    }),
  );
}
