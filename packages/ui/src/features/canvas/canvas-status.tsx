import IconWarningCircleRegular from "phosphor-icons-solid/IconWarningCircleRegular";
import IconCircleNotchRegular from "phosphor-icons-solid/IconCircleNotchRegular";
import { For, Show } from "solid-js";

import type { CanvasStatusMessage, CanvasStatusTone } from "@lisca/ui-headless";
import { canvasToastPresentation, shouldHideToastText } from "@lisca/ui-headless/canvas-status";
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
    return <IconWarningCircleRegular class="mt-0.5 size-4 shrink-0" />;
  }
  if (presentation === "loading") {
    return <IconCircleNotchRegular class="mt-0.5 size-4 shrink-0 animate-spin" />;
  }
  return null;
}

export function CanvasStatusMessageStack(props: {
  class?: string;
  messages?: CanvasStatusMessage[];
}) {
  return (
    <Show when={props.messages?.length}>
      <div
        class={cn(
          "pointer-events-none absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-1.5",
          props.class,
        )}
      >
        <For each={props.messages}>
          {(message) => (
            <div
              class={cn(
                "whitespace-pre-line rounded-md border bg-card/95 px-3 py-2 text-sm leading-snug shadow-lg backdrop-blur-sm",
                messageToneClassName(message.tone),
              )}
            >
              {message.text}
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

export function CanvasToastStack(props: { class?: string; messages?: CanvasStatusMessage[] }) {
  return (
    <Show when={props.messages?.length}>
      <div
        aria-live="polite"
        class={cn(
          "pointer-events-none absolute right-3 top-3 z-20 flex w-[min(24rem,calc(100%-1.5rem))] flex-col items-end gap-2",
          props.class,
        )}
      >
        <For each={props.messages}>
          {(message) => {
            const icon = toastIcon(message);
            const hideText = shouldHideToastText(message);
            return (
              <div
                class={cn(
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
                <Show when={!hideText}>
                  <span class="min-w-0">{message.text}</span>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

export { useCanvasTransientStatus } from "@lisca/ui-headless/canvas-transient-status";