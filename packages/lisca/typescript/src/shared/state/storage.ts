export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function resolveSessionStorage(): SessionStorageLike | null {
  if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
  return null;
}

export function readStoredStringWithFallback(
  storage: SessionStorageLike | null,
  key: string,
  legacyKey?: string,
): string | null {
  return storage?.getItem(key) ?? (legacyKey ? storage?.getItem(legacyKey) ?? null : null);
}

export function persistStoredString(
  storage: SessionStorageLike | null,
  key: string,
  value: string | null,
  legacyKey?: string,
) {
  if (!storage) return;
  if (value) {
    storage.setItem(key, value);
  } else {
    storage.removeItem(key);
  }
  if (legacyKey) storage.removeItem(legacyKey);
}
