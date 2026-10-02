import { createSignal } from "solid-js";

import type { StudioTaskScope } from "./studio-task-scope";

const [openScope, setOpenScope] = createSignal<StudioTaskScope | null>(null);

/** Ask the task center for this page scope to open, including after a route change. */
export function openStudioTaskCenter(scope: StudioTaskScope) {
  setOpenScope(scope);
}

export function studioTaskCenterOpenScope(): StudioTaskScope | null {
  return openScope();
}

export function clearStudioTaskCenterOpen() {
  setOpenScope(null);
}
