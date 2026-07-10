import { createEffect } from "solid-js";

/** Keep a ref to the latest value — for effects that must not re-subscribe when it changes. */
export function useLatest<T>(value: T) {
  const ref = { current: value };
  createEffect(() => {
    ref.current = value;
  });
  return ref;
}