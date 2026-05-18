"use client";

import { useEffect, useState } from "react";

import type { CanvasStatusMessage, CanvasStatusTone } from "@lisca/contracts";

import { cn } from "../lib/utils";

function messageToneClassName(tone: CanvasStatusTone | undefined) {
  if (tone === "error")
    return "border-destructive/35 bg-destructive/10 text-destructive-foreground";
  if (tone === "success") {
    return "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  return "border-border text-muted-foreground";
}

function toastToneClassName(tone: CanvasStatusTone | undefined) {
  if (tone === "error") {
    return "border-destructive/35 bg-destructive/10 text-destructive-foreground before:bg-destructive";
  }
  if (tone === "success") {
    return "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 before:bg-emerald-500 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300 dark:before:bg-emerald-400";
  }
  return "border-border/80 text-popover-foreground before:bg-ring/70";
}

export function CanvasStatusMessageStack({
  className,
  messages,
}: {
  className?: string;
  messages?: CanvasStatusMessage[];
}) {
  if (!messages?.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-1.5",
        className,
      )}
    >
      {messages.map((message, index) => (
        <div
          key={`${message.tone ?? "default"}:${message.text}:${index}`}
          className={cn(
            "rounded-md border bg-card/95 px-3 py-2 text-sm leading-snug shadow-lg backdrop-blur-sm",
            messageToneClassName(message.tone),
          )}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
}

export function CanvasToastStack({
  className,
  messages,
}: {
  className?: string;
  messages?: CanvasStatusMessage[];
}) {
  if (!messages?.length) return null;

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute right-3 top-3 z-20 flex w-[min(24rem,calc(100%-1.5rem))] flex-col items-end gap-2",
        className,
      )}
    >
      {messages.map((message, index) => (
        <div
          key={`${message.tone ?? "default"}:${message.text}:${index}`}
          className={cn(
            "relative max-w-full overflow-hidden rounded-lg border bg-popover/95 px-3 py-2 pl-3.5 text-sm leading-snug shadow-lg backdrop-blur-md before:absolute before:inset-y-2 before:left-0 before:w-0.5",
            toastToneClassName(message.tone),
          )}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </div>
      ))}
    </div>
  );
}

export function useCanvasTransientStatus(
  status: string | null,
  options?: {
    hideAfterMs?: number;
    persistentStatuses?: readonly string[];
  },
): string | null {
  const [visibleStatus, setVisibleStatus] = useState<string | null>(status);
  const hideAfterMs = options?.hideAfterMs ?? 2500;
  const persistentStatuses = options?.persistentStatuses;

  useEffect(() => {
    if (!status) {
      setVisibleStatus(null);
      return;
    }
    setVisibleStatus(status);
    if (persistentStatuses?.includes(status)) return;

    const timeoutId = window.setTimeout(() => {
      setVisibleStatus((current) => (current === status ? null : current));
    }, hideAfterMs);
    return () => window.clearTimeout(timeoutId);
  }, [hideAfterMs, persistentStatuses, status]);

  return visibleStatus;
}
