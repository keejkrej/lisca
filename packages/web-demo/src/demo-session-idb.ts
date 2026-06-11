const DB_NAME = "lisca-demo";
const DB_VERSION = 1;
const STORE = "sessions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open demo session database"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function readDemoSession<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const request = store.get(key);
      request.onerror = () => reject(request.error ?? new Error("Failed to read demo session"));
      request.onsuccess = () => {
        resolve((request.result as T | undefined) ?? null);
      };
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error("Failed to read demo session"));
      };
    });
  } catch {
    return null;
  }
}

export async function writeDemoSession(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const request = store.put(value, key);
      request.onerror = () => reject(request.error ?? new Error("Failed to write demo session"));
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error("Failed to write demo session"));
      };
    });
  } catch {
    // ignore quota / serialization errors
  }
}

export async function clearDemoSession(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const request = store.delete(key);
      request.onerror = () => reject(request.error ?? new Error("Failed to clear demo session"));
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error("Failed to clear demo session"));
      };
    });
  } catch {
    // ignore
  }
}
