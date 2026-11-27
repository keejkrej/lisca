export type CanvasTransientStatusOptions = {
  hideAfterMs?: number | undefined;
  persistentStatuses?: readonly string[] | undefined;
  initialStatus?: string | null | undefined;
};

export type UseCanvasTransientStatusOptions = CanvasTransientStatusOptions;

export type CanvasTransientStatusListener = (visibleStatus: string | null) => void;

export type CanvasTransientStatusController = {
  setStatus: (status: string | null, overrides?: CanvasTransientStatusOptions) => void;
  getVisibleStatus: () => string | null;
  subscribe: (listener: CanvasTransientStatusListener) => () => void;
  dispose: () => void;
};

export function createCanvasTransientStatus(
  options?: CanvasTransientStatusOptions | number,
): CanvasTransientStatusController {
  const defaultHideAfterMs = typeof options === "number" ? options : (options?.hideAfterMs ?? 2500);
  const defaultPersistentStatuses =
    typeof options === "number" ? undefined : options?.persistentStatuses;
  const initialStatus = typeof options === "number" ? null : (options?.initialStatus ?? null);

  let visibleStatus: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  const listeners = new Set<CanvasTransientStatusListener>();

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const emit = () => {
    for (const listener of listeners) {
      listener(visibleStatus);
    }
  };

  const setStatus = (status: string | null, overrides?: CanvasTransientStatusOptions) => {
    if (disposed) return;
    clearTimer();
    if (!status) {
      if (visibleStatus !== null) {
        visibleStatus = null;
        emit();
      }
      return;
    }
    const hideAfterMs = overrides?.hideAfterMs ?? defaultHideAfterMs;
    const persistentStatuses = overrides?.persistentStatuses ?? defaultPersistentStatuses;
    const changed = visibleStatus !== status;
    visibleStatus = status;
    if (changed) emit();
    if (persistentStatuses?.includes(status)) return;

    timer = setTimeout(() => {
      timer = null;
      if (disposed || visibleStatus !== status) return;
      visibleStatus = null;
      emit();
    }, hideAfterMs);
  };

  if (initialStatus !== null) {
    setStatus(initialStatus);
  }

  return {
    setStatus,
    getVisibleStatus: () => visibleStatus,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      disposed = true;
      clearTimer();
      listeners.clear();
    },
  };
}
