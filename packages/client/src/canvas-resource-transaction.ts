import { batch } from "solid-js";

export type CanvasResourceTransactionOptions<T> = {
  start?: () => void;
  load: (signal: AbortSignal) => Promise<T>;
  commit: (value: T) => void;
  reject: (cause: unknown) => void;
  settle?: () => void;
};

export function createCanvasResourceTransaction() {
  const transactionIdRef = { current: 0 };
  return <T>(transactionOptions: CanvasResourceTransactionOptions<T>) => {
    transactionIdRef.current += 1;
    const transactionId = transactionIdRef.current;
    const abortController = new AbortController();
    const isCurrent = () =>
      transactionIdRef.current === transactionId && !abortController.signal.aborted;
    const applyIfCurrent = (apply: () => void) => {
      if (isCurrent()) batch(apply);
    };
    transactionOptions.start?.();
    void transactionOptions
      .load(abortController.signal)
      .then((value) => applyIfCurrent(() => transactionOptions.commit(value)))
      .catch((cause) => applyIfCurrent(() => transactionOptions.reject(cause)))
      .finally(() => applyIfCurrent(() => transactionOptions.settle?.()));
    return () => abortController.abort();
  };
}
