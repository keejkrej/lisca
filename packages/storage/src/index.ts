export type LiscaStorageAdapter = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type NativeStorageBackend = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
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

export function createMemoryBackedStorage(backend: NativeStorageBackend): LiscaStorageAdapter & {
  hydrate(): Promise<void>;
} {
  const cache = new Map<string, string>();

  const adapter: LiscaStorageAdapter & { hydrate(): Promise<void> } = {
    getItem(key) {
      return cache.get(key) ?? null;
    },
    setItem(key, value) {
      cache.set(key, value);
      void backend.setItem(key, value);
    },
    removeItem(key) {
      cache.delete(key);
      void backend.removeItem(key);
    },
    async hydrate() {
      if (!backend.getAllKeys) return;
      const keys = await backend.getAllKeys();
      await Promise.all(
        keys.map(async (key) => {
          const value = await backend.getItem(key);
          if (value != null) cache.set(key, value);
        }),
      );
    },
  };

  return adapter;
}

export function createNativeStorageAdapters(backend: NativeStorageBackend): {
  local: LiscaStorageAdapter & { hydrate(): Promise<void> };
  session: LiscaStorageAdapter & { hydrate(): Promise<void> };
  hydrate(): Promise<void>;
} {
  const local = createMemoryBackedStorage({
    ...backend,
    getItem: (key) => backend.getItem(`local:${key}`),
    setItem: (key, value) => backend.setItem(`local:${key}`, value),
    removeItem: (key) => backend.removeItem(`local:${key}`),
    getAllKeys: backend.getAllKeys
      ? async () => (await backend.getAllKeys!()).filter((key) => key.startsWith("local:"))
      : undefined,
  });

  const session = createMemoryBackedStorage({
    ...backend,
    getItem: (key) => backend.getItem(`session:${key}`),
    setItem: (key, value) => backend.setItem(`session:${key}`, value),
    removeItem: (key) => backend.removeItem(`session:${key}`),
    getAllKeys: backend.getAllKeys
      ? async () => (await backend.getAllKeys!()).filter((key) => key.startsWith("session:"))
      : undefined,
  });

  return {
    local,
    session,
    async hydrate() {
      await Promise.all([local.hydrate(), session.hydrate()]);
    },
  };
}
