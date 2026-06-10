import { useRef } from "react";

export type CanvasResourceTransactionOptions<T> = {
  start?: () => void;
  load: (signal: AbortSignal) => Promise<T>;
  commit: (value: T) => void;
  reject: (cause: unknown) => void;
  settle?: () => void;
};

export type UseCanvasResourceTransactionOptions = {
  batch?: (apply: () => void) => void;
};

export function useCanvasResourceTransaction(options?: UseCanvasResourceTransactionOptions) {
  const batch = options?.batch ?? ((apply: () => void) => apply());
  const transactionIdRef = useRef(0);
  const runRef = useRef(<T>(transactionOptions: CanvasResourceTransactionOptions<T>) => {
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
  });
  return runRef.current;
}
