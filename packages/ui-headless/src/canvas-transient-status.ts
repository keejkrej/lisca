import { useEffect, useRef, useState } from "react";

export type UseCanvasTransientStatusOptions = {
  hideAfterMs?: number;
  persistentStatuses?: readonly string[];
};

export function useCanvasTransientStatus(
  status: string | null,
  options?: UseCanvasTransientStatusOptions | number,
): string | null {
  const hideAfterMs = typeof options === "number" ? options : (options?.hideAfterMs ?? 2500);
  const persistentStatuses =
    typeof options === "number" ? undefined : options?.persistentStatuses;
  const [visibleStatus, setVisibleStatus] = useState<string | null>(status);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!status) {
      setVisibleStatus(null);
      return;
    }
    setVisibleStatus(status);
    if (persistentStatuses?.includes(status)) return;

    timerRef.current = setTimeout(() => {
      setVisibleStatus((current) => (current === status ? null : current));
    }, hideAfterMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hideAfterMs, persistentStatuses, status]);

  return visibleStatus;
}
