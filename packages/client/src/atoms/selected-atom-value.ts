import { Effect, Queue, Stream } from "effect";
import type { Atom, AtomRegistry } from "effect/reactivity";

/**
 * Subscribe to an Effect Atom in a registry and invoke `onChange` immediately
 * with the current value and on every subsequent update.
 */
export function subscribeAtom<A>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<A>,
  onChange: (value: A) => void,
): () => void {
  onChange(registry.get(atom));
  return registry.subscribe(atom, onChange);
}

/**
 * Expose an Effect Atom from a registry as an Effect `Stream` that emits the
 * current value immediately and every subsequent value until the stream scope closes.
 */
export function atomStream<A>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<A>,
): Stream.Stream<A> {
  return Stream.callback<A>((queue) =>
    Effect.gen(function* () {
      Queue.offerUnsafe(queue, registry.get(atom));
      const unsubscribe = registry.subscribe(atom, (next) => {
        Queue.offerUnsafe(queue, next);
      });
      yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
    }),
  );
}
