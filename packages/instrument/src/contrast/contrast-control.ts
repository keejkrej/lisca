import type { Html } from "@effect/ui/html";
import type { ContrastWindow } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { Field, FieldLabel } from "@lisca/ui/field";
import { Section, StateToggleIndicator } from "@lisca/ui/patterns";
import { Slider } from "@lisca/ui/slider";
import { Toggle } from "@lisca/ui/toggle";
import { clamp, deriveContrastControlState, type FrameResult } from "@lisca/utils";

export type { ContrastWindow };

export type ContrastControlOptions<M> = {
  readonly key?: string | undefined;
  readonly frame: FrameResult | null;
  readonly contrast: ContrastWindow | null;
  readonly onContrastChange: (
    contrast: ContrastWindow | null,
    meta?: { readonly lock?: boolean },
  ) => M;
  /** Whether the current window stays pinned across frame changes. */
  readonly contrastLocked?: boolean | undefined;
  readonly onContrastLockedChange?: ((locked: boolean) => M) | undefined;
  /** Optional combined message when adjusting contrast should also pin the lock. */
  readonly onPinContrast?: ((contrast: ContrastWindow) => M) | undefined;
  readonly disabled?: boolean | undefined;
  readonly title?: string | undefined;
  readonly class?: string | undefined;
  readonly sectionTitle?: string | undefined;
  readonly sectionDescription?: string | undefined;
  readonly sectionClassName?: string | undefined;
  readonly sectionContentClassName?: string | undefined;
  readonly sectionAppearance?: "framed" | "rail" | undefined;
  readonly ariaLabel?: string | undefined;
  readonly role?: string | undefined;
};

export type ContrastControlProps<M = never> = ContrastControlOptions<M>;

/**
 * Renders in a {@link Section} card. Optional **title** inside the body before the action row.
 * Layout: **Lock** beside **Auto**, then the **Min** / **Max** sliders.
 */
export function ContrastControl<M>(h: Html.H<M>, options: ContrastControlOptions<M>) {
  const { domain, suggestedContrast, value } = deriveContrastControlState(
    options.frame,
    options.contrast,
  );
  const disabled = options.disabled ?? !options.frame;
  const locked = options.contrastLocked ?? false;
  const showLock = options.onContrastLockedChange !== undefined;
  const domainOk = domain.max > domain.min;
  const isRail = options.sectionAppearance === "rail";

  const emitWindow = (window: ContrastWindow): M =>
    options.onPinContrast
      ? options.onPinContrast(window)
      : options.onContrastChange(window, { lock: true });

  const sectionDescription =
    options.sectionDescription ?? "Display only. Analysis uses the original intensities.";
  const sectionTitle = options.sectionTitle ?? "Contrast";

  if (!domainOk) {
    return Section(h, {
      ...(options.key !== undefined ? { key: options.key } : {}),
      appearance: options.sectionAppearance,
      class: options.sectionClassName,
      contentClassName: options.sectionContentClassName,
      description: sectionDescription,
      title: sectionTitle,
      children: h.div
        .class(cn("min-h-0", options.class))
        .children(h.p.class("text-muted-foreground text-xs").children("Invalid intensity domain.")),
    });
  }

  let body = h.div
    .class(cn("flex w-full min-w-0 flex-col", isRail ? "gap-2" : "gap-3", options.class))
    .children(
      options.title?.trim()
        ? h.span
            .class("shrink-0 font-medium text-foreground text-sm")
            .children(options.title.trim())
        : undefined,
      h.div.class(cn("flex w-full min-w-0 flex-col", isRail ? "gap-2" : "gap-3")).children(
        h.div
          .class(
            cn("grid w-full min-w-0 items-center gap-2", showLock ? "grid-cols-2" : "grid-cols-1"),
          )
          .children(
            showLock
              ? Toggle(h, {
                  ariaLabel: "Lock contrast across frames",
                  class: "h-8 min-w-0 justify-center gap-2 px-2 text-xs",
                  disabled,
                  pressed: locked,
                  size: "sm",
                  title: locked
                    ? "Keep this contrast range for every frame"
                    : "Follow each frame's raw intensity range",
                  variant: "outline",
                  onToggle: ({ pressed }) => options.onContrastLockedChange?.(pressed),
                })
                  .attr("data-instrument-state-toggle", "")
                  .children(StateToggleIndicator(h, { pressed: locked }), h.span.children("Lock"))
              : undefined,
            Button(h, {
              type: "button",
              size: "sm",
              variant: "outline",
              disabled,
              class: "h-8 min-w-0 justify-center px-2 text-xs",
              title: "Fit this frame's range",
              onPress: emitWindow(suggestedContrast),
            }).children("Auto"),
          ),
        h.div.class(cn("flex min-h-0 min-w-0 flex-col", isRail ? "gap-2" : "gap-3")).children(
          Field(h, { class: "min-w-0 w-full" }).children(
            h.div.class("flex w-full items-center justify-between gap-2").children(
              FieldLabel(h, { class: "w-auto" }).children("Min"),
              h.span
                .attr("data-slot", "field-value")
                .class("shrink-0 font-normal text-foreground tabular-nums text-sm")
                .children(String(Math.round(value.min))),
            ),
            Slider(h, {
              key: "contrast-min",
              ariaLabel: "Minimum contrast",
              class: "w-full pt-0.5",
              disabled,
              max: domain.max,
              min: domain.min,
              step: 1,
              value: value.min,
              onValueChange: (next) =>
                emitWindow({
                  min: clamp(Math.round(next), domain.min, domain.max),
                  max: value.max,
                }),
              onValueCommitted: (next) =>
                emitWindow({
                  min: clamp(Math.round(next), domain.min, domain.max),
                  max: value.max,
                }),
            }),
          ),
          Field(h, { class: "min-w-0 w-full" }).children(
            h.div.class("flex w-full items-center justify-between gap-2").children(
              FieldLabel(h, { class: "w-auto" }).children("Max"),
              h.span
                .attr("data-slot", "field-value")
                .class("shrink-0 font-normal text-foreground tabular-nums text-sm")
                .children(String(Math.round(value.max))),
            ),
            Slider(h, {
              key: "contrast-max",
              ariaLabel: "Maximum contrast",
              class: "w-full pt-0.5",
              disabled,
              max: domain.max,
              min: domain.min,
              step: 1,
              value: value.max,
              onValueChange: (next) =>
                emitWindow({
                  min: value.min,
                  max: clamp(Math.round(next), domain.min, domain.max),
                }),
              onValueCommitted: (next) =>
                emitWindow({
                  min: value.min,
                  max: clamp(Math.round(next), domain.min, domain.max),
                }),
            }),
          ),
        ),
      ),
    );

  if (options.ariaLabel !== undefined) {
    body = body.attr("aria-label", options.ariaLabel);
  }
  if (options.role !== undefined) {
    body = body.attr("role", options.role);
  }

  return Section(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    appearance: options.sectionAppearance,
    class: options.sectionClassName,
    contentClassName: options.sectionContentClassName,
    description: sectionDescription,
    title: sectionTitle,
    children: body,
  });
}
