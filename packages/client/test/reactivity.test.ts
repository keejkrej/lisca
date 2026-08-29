import { Reactivity } from "effect/unstable/reactivity";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { invalidateAfter, ReactivityKeys } from "../src/atoms/reactivity";

describe("invalidateAfter", () => {
  it("invalidates registered reactivity keys after the effect completes", async () => {
    let refreshed = false;
    const program = Effect.gen(function* () {
      const reactivity = yield* Reactivity.Reactivity;
      const unregister = reactivity.registerUnsafe(
        [ReactivityKeys.annotationLabels("/workspace")],
        () => {
          refreshed = true;
        },
      );
      yield* invalidateAfter(Effect.succeed(["saved"]), [
        ReactivityKeys.annotationLabels("/workspace"),
      ]);
      unregister();
    });

    await Effect.runPromise(program.pipe(Effect.scoped, Effect.provide(Reactivity.layer)));
    expect(refreshed).toBe(true);
  });
});

describe("ReactivityKeys", () => {
  it("uses stable string identities for invalidation matching", () => {
    expect(ReactivityKeys.annotationLabels("/a")).toBe(ReactivityKeys.annotationLabels("/a"));
    expect(ReactivityKeys.annotationLabels("/a")).not.toBe(ReactivityKeys.annotationLabels("/b"));
  });
});
