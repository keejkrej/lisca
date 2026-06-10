export type PortRegistry<T> = {
  read: () => T | undefined;
  ensure: () => T;
  setForTests: (port: T) => void;
  resetForTests: () => void;
};

/** @deprecated Use `createLiscaAppBootstrap` — port registry duplicates atom runtime DI. */
export function createPortRegistry<T>(createDefault: () => T): PortRegistry<T> {
  let singleton: T | undefined;
  const overrides = new Map<symbol, T>();
  const overrideKey = Symbol("port-override");

  return {
    read() {
      const override = overrides.get(overrideKey);
      if (override) return override;
      singleton ??= createDefault();
      return singleton;
    },
    ensure() {
      const port = this.read();
      if (!port) {
        throw new Error("Port is not available");
      }
      return port;
    },
    setForTests(port) {
      overrides.set(overrideKey, port);
    },
    resetForTests() {
      overrides.delete(overrideKey);
      singleton = undefined;
    },
  };
}
