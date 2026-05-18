"use client";

import { CircleAlert, Loader2Icon } from "lucide-react";
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
    return "border-destructive/35 bg-destructive/10 text-destructive-foreground";
  }
  if (tone === "success") {
    return "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  return "border-border/80 text-popover-foreground";
}

function shouldShowLoadingIcon(message: CanvasStatusMessage): boolean {
  if (message.tone != null) return false;
  return /loading|scanning|preview/i.test(message.text);
}

function shouldHideToastText(message: CanvasStatusMessage): boolean {
  return shouldShowLoadingIcon(message);
}

function toastIcon(message: CanvasStatusMessage) {
  if (message.tone === "error") {
    return <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />;
  }
  if (shouldShowLoadingIcon(message)) {
    return <Loader2Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin" />;
  }
  return null;
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
            "whitespace-pre-line rounded-md border bg-card/95 px-3 py-2 text-sm leading-snug shadow-lg backdrop-blur-sm",
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
      {messages.map((message, index) => {
        const icon = toastIcon(message);
        const hideText = shouldHideToastText(message);
        return (
          <div
            key={`${message.tone ?? "default"}:${message.text}:${index}`}
            className={cn(
              "flex max-w-full items-start rounded-lg text-sm leading-snug",
              hideText
                ? "p-1 text-popover-foreground drop-shadow-sm"
                : "gap-2 border bg-popover/95 px-3 py-2 shadow-lg/5 backdrop-blur-md",
              !hideText && toastToneClassName(message.tone),
            )}
            aria-label={hideText ? message.text : undefined}
            role={message.tone === "error" ? "alert" : "status"}
          >
            {icon}
            {hideText ? null : <span className="min-w-0">{message.text}</span>}
          </div>
        );
      })}
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
