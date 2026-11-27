import { Subscription } from "@effect/ui";
import { Effect, Queue, Stream } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

import {
  createInitialStudioWizardState,
  readStudioSession,
  studioWizardAtom,
} from "@lisca/client/atoms/studio-ui";

function createStudioRegistry(): AtomRegistry.AtomRegistry {
  const registry = AtomRegistry.make();
  const wizardSession = readStudioSession();
  registry.set(studioWizardAtom, wizardSession ?? createInitialStudioWizardState());
  return registry;
}

export let studioRegistry: AtomRegistry.AtomRegistry = createStudioRegistry();

/** Resets the shared Studio AtomRegistry (for tests). */
export function resetStudioRegistry(): AtomRegistry.AtomRegistry {
  studioRegistry.dispose();
  studioRegistry = createStudioRegistry();
  return studioRegistry;
}

/** Updates a writable atom on the shared Studio registry. */
export function setStudioAtom<R, W>(
  atom: Atom.Writable<R, W>,
  update: W | ((current: R) => W),
): void {
  const current = studioRegistry.get(atom);
  const next = typeof update === "function" ? (update as (current: R) => W)(current) : update;
  studioRegistry.set(atom, next);
}

/** Effect UI subscription that emits `message` whenever any of `atoms` changes. */
export function studioAtomsSubscription<M>(
  key: string,
  atoms: readonly Atom.Atom<any>[],
  message: M,
) {
  return Subscription.make(key, atoms.length, () =>
    Stream.callback<M>((queue) => {
      const unsubscribes = atoms.map((atom) =>
        studioRegistry.subscribe(atom, () => {
          Queue.offerUnsafe(queue, message);
        }),
      );
      return Effect.addFinalizer(() =>
        Effect.sync(() => {
          for (const unsub of unsubscribes) unsub();
        }),
      );
    }),
  );
}
