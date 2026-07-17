export type LiscaStorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const webLocalStorage: LiscaStorageAdapter = {
  getItem(key) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  removeItem(key) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};

const webSessionStorage: LiscaStorageAdapter = {
  getItem(key) {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(key);
  },
  setItem(key, value) {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(key, value);
  },
  removeItem(key) {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(key);
  },
};

let localAdapter: LiscaStorageAdapter = webLocalStorage;
let sessionAdapter: LiscaStorageAdapter = webSessionStorage;

export function configureLiscaStorage(config: {
  local?: LiscaStorageAdapter;
  session?: LiscaStorageAdapter;
}): void {
  if (config.local) localAdapter = config.local;
  if (config.session) sessionAdapter = config.session;
}

export function liscaLocalStorage(): LiscaStorageAdapter {
  return localAdapter;
}

export function liscaSessionStorage(): LiscaStorageAdapter {
  return sessionAdapter;
}

export function readStorageJson<T>(adapter: LiscaStorageAdapter, key: string): T | null {
  try {
    const raw = adapter.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStorageJson(adapter: LiscaStorageAdapter, key: string, value: unknown): void {
  try {
    adapter.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / serialization errors
  }
}
