import { createEffect } from "solid-js";

export function useLatestRef<T>(value: () => T) {
  const ref = { current: value() };
  createEffect(() => {
    ref.current = value();
  });
  return ref;
}