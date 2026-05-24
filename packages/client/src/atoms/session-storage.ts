import type { Atom } from "@effect-atom/atom-react";

export function readSessionJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSessionJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function sessionPersistEffect<A>(
  storageKey: string,
  atom: Atom.Writable<A>,
  pick: (state: A) => unknown,
): () => void {
  let current = readSessionJson<ReturnType<typeof pick>>(storageKey);
  return () => {
    // subscription wired in app via registry subscribe
    void current;
    void atom;
    void pick;
    void storageKey;
  };
}
