"use client";

import { CircleAlert, Loader2Icon } from "lucide-react";

import type { CanvasStatusMessage, CanvasStatusTone } from "@lisca/ui-headless";
import {
  canvasToastPresentation,
  shouldHideToastText,
} from "@lisca/ui-headless/canvas-status";
import { cn } from "../../lib/utils";

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

function toastIcon(message: CanvasStatusMessage) {
  const presentation = canvasToastPresentation(message);
  if (presentation === "error") {
    return <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />;
  }
  if (presentation === "loading") {
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
      {messages.map((message) => (
        <div
          key={`${message.tone ?? "default"}:${message.text}`}
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
      {messages.map((message) => {
        const icon = toastIcon(message);
        const hideText = shouldHideToastText(message);
        return (
          <div
            key={`${message.tone ?? "default"}:${message.text}`}
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

export { useCanvasTransientStatus } from "@lisca/ui-headless/canvas-transient-status";
