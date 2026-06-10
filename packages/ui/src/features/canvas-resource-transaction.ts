import { useRef } from "react";
import { unstable_batchedUpdates } from "react-dom";
export type CanvasResourceTransactionOptions<T> = {
  start?: () => void;
  load: (signal: AbortSignal) => Promise<T>;
  commit: (value: T) => void;
  reject: (cause: unknown) => void;
  settle?: () => void;
};
export function useCanvasResourceTransaction() {
  const transactionIdRef = useRef(0);
  const runRef = useRef(<T>(options: CanvasResourceTransactionOptions<T>) => {
    transactionIdRef.current += 1;
    const transactionId = transactionIdRef.current;
    const abortController = new AbortController();
    const isCurrent = () =>
      transactionIdRef.current === transactionId && !abortController.signal.aborted;
    const applyIfCurrent = (apply: () => void) => {
      if (isCurrent()) unstable_batchedUpdates(apply);
    };
    options.start?.();
    void options
      .load(abortController.signal)
      .then((value) => applyIfCurrent(() => options.commit(value)))
      .catch((cause) => applyIfCurrent(() => options.reject(cause)))
      .finally(() => applyIfCurrent(() => options.settle?.()));
    return () => abortController.abort();
  });
  return runRef.current;
}
