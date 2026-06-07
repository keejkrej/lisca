import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureLiscaStorage, createNativeStorageAdapters } from "@lisca/storage";
import { useEffect, useState, type ReactNode } from "react";

const nativeStorage = createNativeStorageAdapters(AsyncStorage);
let configured = false;

export function StorageBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(configured);

  useEffect(() => {
    if (configured) return;
    void nativeStorage.hydrate().then(() => {
      configureLiscaStorage({ local: nativeStorage.local, session: nativeStorage.session });
      configured = true;
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  return children;
}
