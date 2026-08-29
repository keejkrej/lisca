import { Atom } from "effect/unstable/reactivity";
import { Reactivity } from "effect/unstable/reactivity";

/** Runtime shared by query and mutation atoms. App ports are captured by atom factories. */
export function createAppRuntime() {
  return Atom.runtime(Reactivity.layer);
}

export type AppRuntime = ReturnType<typeof createAppRuntime>;

/** Retain inactive query results briefly without leaking every family key for the app lifetime. */
export const cacheSessionQuery = Atom.setIdleTTL("5 minutes");
