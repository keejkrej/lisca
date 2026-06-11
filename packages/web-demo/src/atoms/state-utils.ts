export type StateUpdater<T> = T | ((current: T) => T);

export function resolveNextValue<T>(current: T, next: StateUpdater<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(current) : next;
}
