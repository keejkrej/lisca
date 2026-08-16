import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

export type UseCanvasTransientStatusOptions = {
  hideAfterMs?: number;
  persistentStatuses?: readonly string[];
};

export function useCanvasTransientStatus(
  status: Accessor<string | null>,
  options?: UseCanvasTransientStatusOptions | number | Accessor<UseCanvasTransientStatusOptions>,
): Accessor<string | null> {
  const [visibleStatus, setVisibleStatus] = createSignal<string | null>(status());
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };

  createEffect(() => {
    const currentStatus = status();
    const hideAfterMs =
      typeof options === "number"
        ? options
        : typeof options === "function"
          ? (options().hideAfterMs ?? 2500)
          : (options?.hideAfterMs ?? 2500);
    const persistentStatuses =
      typeof options === "number"
        ? undefined
        : typeof options === "function"
          ? options().persistentStatuses
          : options?.persistentStatuses;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!currentStatus) {
      setVisibleStatus(null);
      return;
    }
    setVisibleStatus(currentStatus);
    if (persistentStatuses?.includes(currentStatus)) return;

    timerRef.current = setTimeout(() => {
      setVisibleStatus((current) => (current === currentStatus ? null : current));
    }, hideAfterMs);
    onCleanup(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
    });
  });

  return visibleStatus;
}
