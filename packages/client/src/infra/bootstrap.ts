import type { Layer } from "effect";

import { createAppRuntime, type AppRuntime } from "../atoms/runtime";

/** Create the app atom runtime from its sole dependency-injection Layer. */
export function createLiscaAppBootstrap<R>(portLayer: Layer.Layer<R>): {
  readonly runtime: AppRuntime<R>;
} {
  return { runtime: createAppRuntime(portLayer) };
}
