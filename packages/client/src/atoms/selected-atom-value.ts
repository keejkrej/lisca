import type { Atom } from "@effect-atom/atom-solid";
import { RegistryContext } from "@effect-atom/atom-solid";
import { createEffect, createSignal, onCleanup, useContext, type Accessor } from "solid-js";

/** Subscribe to the currently selected Effect Atom without pinning its key. */
export function useSelectedAtomValue<A>(selectAtom: () => Atom.Atom<A>): Accessor<A> {
  const registry = useContext(RegistryContext);
  const [value, setValue] = createSignal(registry.get(selectAtom()));
  createEffect(() => {
    const atom = selectAtom();
    setValue(() => registry.get(atom));
    onCleanup(registry.subscribe(atom, setValue as (next: A) => void));
  });
  return value;
}
