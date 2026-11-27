export type CanvasResourceTransactionOptions<T> = {
  start?: (() => void) | undefined;
  load: (signal: AbortSignal) => Promise<T>;
  commit: (value: T) => void;
  reject: (cause: unknown) => void;
  settle?: (() => void) | undefined;
};

export type CanvasResourceTransactionRunner = <T>(
  transactionOptions: CanvasResourceTransactionOptions<T>,
) => () => void;

export function createCanvasResourceTransaction(): CanvasResourceTransactionRunner {
  const transactionIdRef = { current: 0 };
  const run: CanvasResourceTransactionRunner = (transactionOptions) => {
    transactionIdRef.current += 1;
    const transactionId = transactionIdRef.current;
    const abortController = new AbortController();
    const isCurrent = () =>
      transactionIdRef.current === transactionId && !abortController.signal.aborted;
    const applyIfCurrent = (apply: () => void) => {
      if (isCurrent()) apply();
    };
    transactionOptions.start?.();
    void transactionOptions
      .load(abortController.signal)
      .then((value) => applyIfCurrent(() => transactionOptions.commit(value)))
      .catch((cause) => applyIfCurrent(() => transactionOptions.reject(cause)))
      .finally(() => applyIfCurrent(() => transactionOptions.settle?.()));
    return () => abortController.abort();
  };
  return run;
}

export const useCanvasResourceTransaction = createCanvasResourceTransaction;
