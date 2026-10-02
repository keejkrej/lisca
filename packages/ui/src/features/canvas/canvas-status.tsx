import IconWarningCircleRegular from "phosphor-icons-solid/IconWarningCircleRegular";
import { For, Show } from "solid-js";
import { Portal } from "solid-js/web";

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
    return "border-border bg-popover text-foreground";
  }
  return "border-border bg-popover text-popover-foreground";
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

function ToastCards(props: { class?: string; fixed?: boolean; messages: CanvasStatusMessage[] }) {
  return (
    <div
      aria-live="polite"
      class={cn(
        "pointer-events-none flex w-[min(22rem,calc(100%-2rem))] flex-col items-start gap-2",
        props.fixed && "fixed bottom-4 left-4 z-50",
        props.class,
      )}
    >
      <For each={props.messages}>
        {(message) => {
          const icon = toastIcon(message);
          return (
            <div
              class={cn(
                "flex max-w-full items-start gap-2 rounded-none border px-3 py-2 text-sm leading-snug shadow-sm",
                toastToneClassName(message.tone),
              )}
              role={message.tone === "error" ? "alert" : "status"}
            >
              {icon}
              <span class="min-w-0">{message.text}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
}

export function CanvasToastStack(props: {
  class?: string;
  messages?: CanvasStatusMessage[];
  /**
   * `overlay` is portaled to the bottom-left of the window.
   * `stack` renders in place, for a parent that places the cards.
   */
  layout?: "overlay" | "stack" | "inline";
}) {
  const overlay = () => props.layout !== "stack" && props.layout !== "inline";
  const messages = () => props.messages ?? [];
  return (
    <Show when={messages().length}>
      <Show when={overlay()} fallback={<ToastCards class={props.class} messages={messages()} />}>
        <Portal>
          <ToastCards fixed class={props.class} messages={messages()} />
        </Portal>
      </Show>
    </Show>
  );
}

export { useCanvasTransientStatus } from "@lisca/ui-headless/canvas-transient-status";
