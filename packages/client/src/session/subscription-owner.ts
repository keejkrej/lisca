const noop = () => {};

/** Owns one async-created subscription and closes stale subscriptions after races. */
export function createSubscriptionOwner() {
  let generation = 0;
  let stop = noop;

  return {
    async replace(start: () => Promise<() => void>): Promise<void> {
      const currentGeneration = ++generation;
      stop();
      stop = noop;
      const nextStop = await start();
      if (currentGeneration !== generation) {
        nextStop();
        return;
      }
      stop = nextStop;
    },
    clear(): void {
      generation++;
      stop();
      stop = noop;
    },
  };
}
