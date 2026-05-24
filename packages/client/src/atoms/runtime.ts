import { Atom } from "@effect-atom/atom-react";
import { Reactivity } from "@effect/experimental";
import { Layer } from "effect";

export function createAppRuntime<R>(portLayer: Layer.Layer<R>) {
  return Atom.runtime(Layer.mergeAll(Reactivity.layer, portLayer));
}

export type AppRuntime<R> = ReturnType<typeof createAppRuntime<R>>;
