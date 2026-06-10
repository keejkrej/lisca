import { useEffect, useRef, useState } from "react";

export function useCanvasTransientStatus(status: string | null, durationMs = 2400): string | null {
  const [visible, setVisible] = useState<string | null>(status);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!status) {
      setVisible(null);
      return;
    }
    setVisible(status);
    timerRef.current = setTimeout(() => setVisible(null), durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [durationMs, status]);

  return visible;
}
