import type { Html } from "@effect/ui/html";
import type { CanvasStatusMessage, CanvasStatusTone } from "@lisca/ui-headless";
import { canvasToastPresentation } from "@lisca/ui-headless/canvas-status";
import { cn } from "@lisca/ui/cn";
import { Icon } from "@lisca/ui/icons";

function messageToneClassName(tone: CanvasStatusTone | undefined): string {
  if (tone === "error") return "z-destructive-surface";
  if (tone === "success") {
    // Neutral ink/muted — GFP green is biological signal only (DESIGN.md).
    return "border-border bg-muted text-foreground";
  }
  return "border-border text-muted-foreground";
}

function toastToneClassName(tone: CanvasStatusTone | undefined): string {
  if (tone === "error") return "z-destructive-surface";
  if (tone === "success") {
    // Neutral ink/muted — GFP green is biological signal only (DESIGN.md).
    return "border-border bg-popover text-foreground";
  }
  return "border-border bg-popover text-popover-foreground";
}

export type CanvasStatusMessageStackOptions = {
  readonly class?: string | undefined;
  readonly messages?: readonly CanvasStatusMessage[] | undefined;
  readonly align?: "left" | "right" | undefined;
  readonly layout?: "overlay" | "inline" | undefined;
};

export function CanvasStatusMessageStack<M>(
  h: Html.H<M>,
  options: CanvasStatusMessageStackOptions,
) {
  const messages = options.messages ?? [];
  if (messages.length === 0) return undefined;

  const align = options.align ?? "left";
  const layout = options.layout ?? "overlay";

  return h.div
    .class(
      cn(
        "flex flex-wrap gap-1.5",
        layout === "overlay"
          ? cn(
              "pointer-events-none absolute top-3 max-w-[78%]",
              align === "left" ? "left-3" : "right-3 justify-end",
            )
          : cn("min-w-0", align === "right" && "justify-end"),
        options.class,
      ),
    )
    .children(
      ...messages.map((message, index) =>
        h.div
          .key(`${message.tone ?? "info"}-${index}-${message.text}`)
          .class(
            cn(
              "whitespace-pre-line rounded-md border bg-card/75 px-3 py-2 text-sm leading-snug",
              messageToneClassName(message.tone),
            ),
          )
          .children(message.text),
      ),
    );
}

export type CanvasToastStackOptions = {
  readonly class?: string | undefined;
  readonly messages?: readonly CanvasStatusMessage[] | undefined;
  /**
   * `overlay` pins fixed to the bottom-left of the viewport.
   * `stack` / `inline` renders in place, for a parent that places the cards.
   */
  readonly layout?: "overlay" | "stack" | "inline" | undefined;
};

export function CanvasToastStack<M>(h: Html.H<M>, options: CanvasToastStackOptions) {
  const messages = options.messages ?? [];
  if (messages.length === 0) return undefined;

  const overlay = options.layout !== "stack" && options.layout !== "inline";

  return h.div
    .attr("aria-live", "polite")
    .class(
      cn(
        "pointer-events-none flex w-[min(22rem,calc(100%-2rem))] flex-col items-start gap-2",
        overlay && "fixed bottom-4 left-4 z-50",
        options.class,
      ),
    )
    .children(
      ...messages.map((message, index) => {
        const presentation = canvasToastPresentation(message);
        return h.div
          .key(`${message.tone ?? "info"}-${index}-${message.text}`)
          .attr("role", message.tone === "error" ? "alert" : "status")
          .class(
            cn(
              "flex max-w-full items-start gap-2 rounded-none border px-3 py-2 text-sm leading-snug shadow-sm",
              toastToneClassName(message.tone),
            ),
          )
          .children(
            presentation === "error"
              ? Icon(h, "warning-circle", { class: "mt-0.5 size-4 shrink-0" })
              : undefined,
            h.span.class("min-w-0").children(message.text),
          );
      }),
    );
}

export { createCanvasTransientStatus } from "@lisca/ui-headless/canvas-transient-status";
