export type StateUpdater<T> = T | ((current: T) => T);

export function resolveStateUpdater<T>(current: T, next: StateUpdater<T>): T {
  if (typeof next === "function") {
    return (next as (value: T) => T)(current);
  }
  return next;
}
