import type { Layer } from "effect";
import { Effect } from "effect";

import type { ClientError } from "./client-error.ts";
import { createAppRuntime, type AppRuntime } from "../atoms/runtime.ts";
import { runClientEffect } from "./runtime.ts";

/**
 * Single bootstrap for an app: one port instance, one atom runtime, one effect runner.
 * Prefer this over maintaining separate port-registry and runtime wiring.
 */
export function createLiscaAppBootstrap<R>(
  portLayer: Layer.Layer<R>,
  port: unknown,
): {
  readonly port: typeof port;
  readonly runtime: AppRuntime<R>;
  readonly runPromise: <A>(effect: Effect.Effect<A, ClientError, R>) => Promise<A>;
} {
  const runtime = createAppRuntime(portLayer);
  return {
    port,
    runtime,
    runPromise: (effect) => runClientEffect(effect.pipe(Effect.provide(portLayer), Effect.scoped)),
  };
}
