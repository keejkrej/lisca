import { createSignal } from "solid-js";

import type { StudioTaskScope } from "./studio-task-scope";

const [openScope, setOpenScope] = createSignal<StudioTaskScope | null>(null);
const [requestedAt, setRequestedAt] = createSignal(0);

/**
 * Route changes and the dialog's first focus pass both dismiss a modal that
 * opens in the same turn. Hold the request across that window so Annotate and
 * Analysis can show the dialog the handoff asked for.
 */
export const STUDIO_TASK_CENTER_OPEN_HOLD_MS = 600;

export function openStudioTaskCenter(scope: StudioTaskScope) {
  setRequestedAt(Date.now());
  setOpenScope(scope);
}

export function studioTaskCenterOpenScope(): StudioTaskScope | null {
  return openScope();
}

export function studioTaskCenterRequestedAt(): number {
  return requestedAt();
}

export function studioTaskCenterOpenIsHeld(openedAt: number, now: number): boolean {
  return openedAt > 0 && now - openedAt < STUDIO_TASK_CENTER_OPEN_HOLD_MS;
}

export function clearStudioTaskCenterOpen() {
  setOpenScope(null);
  setRequestedAt(0);
}
