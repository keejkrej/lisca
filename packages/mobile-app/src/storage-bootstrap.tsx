import AsyncStorageImport from "@react-native-async-storage/async-storage";
import {
  configureLiscaStorage,
  createNativeStorageAdapters,
  type NativeStorageBackend,
} from "@lisca/storage";
import { useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";

type AsyncStorageApi = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<readonly string[]>;
};

const AsyncStorage = AsyncStorageImport as unknown as AsyncStorageApi;

const asyncStorageBackend: NativeStorageBackend = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
  getAllKeys: () => AsyncStorage.getAllKeys(),
};

const nativeStorage = createNativeStorageAdapters(asyncStorageBackend);
let configured = false;

export function StorageBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(configured || Platform.OS === "web");

  useEffect(() => {
    if (configured) return;
    if (Platform.OS === "web") {
      configured = true;
      setReady(true);
      return;
    }
    void nativeStorage.hydrate().then(() => {
      configureLiscaStorage({ local: nativeStorage.local, session: nativeStorage.session });
      configured = true;
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return children;
}
