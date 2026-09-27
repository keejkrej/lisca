import IconWarningCircleRegular from "phosphor-icons-solid/IconWarningCircleRegular";
import { For, Show } from "solid-js";

import type { CanvasStatusMessage, CanvasStatusTone } from "@lisca/ui-headless";
import { canvasToastPresentation } from "@lisca/ui-headless/canvas-status";
import { cn } from "../../lib/utils";

function messageToneClassName(tone: CanvasStatusTone | undefined) {
  if (tone === "error") return "z-destructive-surface";
  if (tone === "success") {
    // Neutral ink/muted — GFP green is biological signal only (DESIGN.md).
    return "border-border bg-muted text-foreground";
  }
  return "border-border text-muted-foreground";
}

function toastToneClassName(tone: CanvasStatusTone | undefined) {
  if (tone === "error") return "z-destructive-surface";
  if (tone === "success") {
    // Neutral ink/muted — GFP green is biological signal only (DESIGN.md).
    return "border-border/80 bg-muted text-foreground";
  }
  return "border-border/80 text-popover-foreground";
}

function toastIcon(message: CanvasStatusMessage) {
  const presentation = canvasToastPresentation(message);
  if (presentation === "error") {
    return <IconWarningCircleRegular class="mt-0.5 size-4 shrink-0" />;
  }
  return null;
}

export function CanvasStatusMessageStack(props: {
  class?: string;
  messages?: CanvasStatusMessage[];
  align?: "left" | "right";
  layout?: "overlay" | "inline";
}) {
  const align = () => props.align ?? "left";
  const layout = () => props.layout ?? "overlay";
  return (
    <Show when={props.messages?.length}>
      <div
        class={cn(
          "flex flex-wrap gap-1.5",
          layout() === "overlay"
            ? cn(
                "pointer-events-none absolute top-3 max-w-[78%]",
                align() === "left" ? "left-3" : "right-3 justify-end",
              )
            : cn("min-w-0", align() === "right" && "justify-end"),
          props.class,
        )}
      >
        <For each={props.messages}>
          {(message) => (
            <div
              class={cn(
                "whitespace-pre-line rounded-md border bg-card/75 px-3 py-2 text-sm leading-snug",
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

export function CanvasToastStack(props: {
  class?: string;
  messages?: CanvasStatusMessage[];
  /** `overlay` floats over the canvas; `inline` sits in a stage caption row without covering the image. */
  layout?: "overlay" | "inline";
}) {
  const inline = () => props.layout === "inline";
  return (
    <Show when={props.messages?.length}>
      <div
        aria-live="polite"
        class={cn(
          inline()
            ? "flex min-w-0 items-center justify-center gap-2"
            : "pointer-events-none absolute right-3 top-3 z-20 flex w-[min(24rem,calc(100%-1.5rem))] flex-col items-end gap-2",
          props.class,
        )}
      >
        <For each={props.messages}>
          {(message) => {
            const icon = toastIcon(message);
            return (
              <div
                class={cn(
                  "flex max-w-full items-start gap-2 rounded-lg border",
                  inline()
                    ? "min-w-0 items-center px-2 py-0.5 text-xs normal-case tracking-normal"
                    : "bg-popover/75 px-3 py-2 text-sm leading-snug",
                  toastToneClassName(message.tone),
                )}
                role={message.tone === "error" ? "alert" : "status"}
                title={inline() ? message.text : undefined}
              >
                {icon}
                <span class={cn("min-w-0", inline() && "truncate")}>{message.text}</span>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

export { useCanvasTransientStatus } from "@lisca/ui-headless/canvas-transient-status";
