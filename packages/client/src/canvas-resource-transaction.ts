export type CanvasResourceTransactionOptions<T> = {
  start?: () => void;
  load: (signal: AbortSignal) => Promise<T>;
  commit: (value: T) => void;
  reject: (cause: unknown) => void;
  settle?: () => void;
};
