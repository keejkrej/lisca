import { useRef } from "react";

/** Keep a ref to the latest value — for effect deps when React Compiler replaces useCallback. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
