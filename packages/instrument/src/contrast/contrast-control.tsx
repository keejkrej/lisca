import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { clamp, deriveContrastControlState } from "@lisca/utils";
import { createEffect, createSignal, Show, type JSX } from "solid-js";

import { Button } from "@lisca/ui/button";
import { Field, FieldLabel } from "@lisca/ui/field";
import { Slider } from "@lisca/ui/slider";
import { Toggle } from "@lisca/ui/toggle";
import { cn } from "@lisca/ui/cn";
import { Section, StateToggleIndicator } from "@lisca/ui/patterns";

export type { ContrastWindow };

export type ContrastControlProps = {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  onContrastChange: (contrast: ContrastWindow | null) => void;
  /** Whether the current window stays pinned across frame changes. */
  contrastLocked?: boolean;
  onContrastLockedChange?: (locked: boolean) => void;
  disabled?: boolean;
  title?: string;
  class?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  sectionAppearance?: "framed" | "rail";
  "aria-label"?: string;
  role?: JSX.AriaAttributes["role"];
};

/**
 * Renders in a {@link Section} card. Optional **title** inside the body before the action row.
 * Layout: **Lock** beside **Auto**, then the **Min** / **Max** sliders. The Lock toggle only
 * appears when the host supplies `onContrastLockedChange`.
 *
 * Lock is a state toggle rather than an action, like the rail's Edit and Show toggles: it
 * decides whether the window survives frame changes, not what the window is. Auto stays an
 * action that also locks, so a chosen window applies to every frame. Unlocking does not
 * rewrite the window; the next frame change returns to that frame's raw domain.
 */
export function ContrastControl(props: ContrastControlProps) {
  const controlState = () => {
    const { domain, suggestedContrast, value } = deriveContrastControlState(
      props.frame,
      props.contrast,
    );
    const disabled = props.disabled ?? !props.frame;
    const pinWindow = (window: ContrastWindow) => {
      if (props.onContrastLockedChange != null && !(props.contrastLocked ?? false)) {
        props.onContrastLockedChange(true);
      }
      props.onContrastChange(window);
    };
    return {
      domainMin: domain.min,
      domainMax: domain.max,
      minValue: value.min,
      maxValue: value.max,
      disabled,
      autoRangeDisabled: disabled,
      onAutoRange: () => pinWindow(suggestedContrast),
      onMinCommit: (min: number) => pinWindow({ min, max: value.max }),
      onMaxCommit: (max: number) => pinWindow({ min: value.min, max }),
      locked: props.contrastLocked ?? false,
      onToggleLocked: () => props.onContrastLockedChange?.(!(props.contrastLocked ?? false)),
      showLock: props.onContrastLockedChange != null,
    };
  };

  return (
    <ContrastControlBody
      aria-label={props["aria-label"]}
      autoRangeDisabled={controlState().autoRangeDisabled}
      class={props.class}
      disabled={controlState().disabled}
      domainMax={controlState().domainMax}
      domainMin={controlState().domainMin}
      locked={controlState().locked}
      maxValue={controlState().maxValue}
      minValue={controlState().minValue}
      role={props.role}
      sectionClassName={props.sectionClassName}
      sectionContentClassName={props.sectionContentClassName}
      sectionAppearance={props.sectionAppearance}
      sectionDescription={props.sectionDescription}
      sectionTitle={props.sectionTitle}
      showLock={controlState().showLock}
      title={props.title}
      onAutoRange={controlState().onAutoRange}
      onMaxCommit={controlState().onMaxCommit}
      onMinCommit={controlState().onMinCommit}
      onToggleLocked={controlState().onToggleLocked}
    />
  );
}

function ContrastControlBody(props: {
  domainMin: number;
  domainMax: number;
  minValue: number;
  maxValue: number;
  disabled: boolean;
  autoRangeDisabled: boolean;
  locked: boolean;
  showLock: boolean;
  onAutoRange: () => void;
  onMinCommit: (min: number) => void;
  onMaxCommit: (max: number) => void;
  onToggleLocked: () => void;
  title?: string;
  class?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  sectionAppearance?: "framed" | "rail";
  "aria-label"?: string;
  role?: JSX.AriaAttributes["role"];
}) {
  const domainOk = () => props.domainMax > props.domainMin;
  const [draft, setDraft] = createSignal<ContrastWindow | null>(null);

  createEffect(() => {
    setDraft({ min: props.minValue, max: props.maxValue });
  });

  const displayed = () => draft() ?? { min: props.minValue, max: props.maxValue };

  return (
    <Show
      when={domainOk()}
      fallback={
        <Section
          appearance={props.sectionAppearance}
          aria-label={props["aria-label"]}
          contentClassName={props.sectionContentClassName}
          description={
            props.sectionDescription ?? "Display only. Analysis uses the original intensities."
          }
          title={props.sectionTitle ?? "Contrast"}
          class={props.sectionClassName}
          role={props.role}
        >
          <div class={cn("min-h-0", props.class)}>
            <p class="text-muted-foreground text-xs">Invalid intensity domain.</p>
          </div>
        </Section>
      }
    >
      <Section
        appearance={props.sectionAppearance}
        aria-label={props["aria-label"]}
        contentClassName={props.sectionContentClassName}
        description={
          props.sectionDescription ?? "Display only. Analysis uses the original intensities."
        }
        title={props.sectionTitle ?? "Contrast"}
        class={props.sectionClassName}
        role={props.role}
      >
        <div
          class={cn(
            "flex w-full min-w-0 flex-col",
            props.sectionAppearance === "rail" ? "gap-2" : "gap-3",
            props.class,
          )}
        >
          <Show when={props.title?.trim()}>
            <span class="shrink-0 font-medium text-foreground text-sm">{props.title!.trim()}</span>
          </Show>

          <div
            class={cn(
              "flex w-full min-w-0 flex-col",
              props.sectionAppearance === "rail" ? "gap-2" : "gap-3",
            )}
          >
            <div
              class={cn(
                "grid w-full min-w-0 items-center gap-2",
                props.showLock ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              <Show when={props.showLock}>
                <Toggle
                  aria-label="Lock contrast across frames"
                  aria-pressed={props.locked}
                  class="h-8 min-w-0 justify-center gap-2 px-2 text-xs"
                  data-instrument-state-toggle=""
                  disabled={props.disabled}
                  pressed={props.locked}
                  size="sm"
                  title={
                    props.locked
                      ? "Keep this contrast range for every frame"
                      : "Follow each frame's raw intensity range"
                  }
                  variant="outline"
                  onChange={props.onToggleLocked}
                >
                  <StateToggleIndicator pressed={props.locked} />
                  <span>Lock</span>
                </Toggle>
              </Show>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={props.disabled || props.autoRangeDisabled}
                class="h-8 min-w-0 justify-center px-2 text-xs"
                title="Fit this frame's range"
                onClick={props.onAutoRange}
              >
                Auto
              </Button>
            </div>

            <div
              class={cn(
                "flex min-h-0 min-w-0 flex-col",
                props.sectionAppearance === "rail" ? "gap-2" : "gap-3",
              )}
            >
              <Field class="min-w-0 w-full">
                <div class="flex w-full items-center justify-between gap-2">
                  <FieldLabel class="w-auto">Min</FieldLabel>
                  <span
                    class="shrink-0 font-normal text-foreground tabular-nums text-sm"
                    data-slot="field-value"
                  >
                    {String(Math.round(displayed().min))}
                  </span>
                </div>
                <Slider
                  aria-label="Minimum contrast"
                  class="w-full pt-0.5"
                  disabled={props.disabled}
                  max={props.domainMax}
                  min={props.domainMin}
                  step={1}
                  value={displayed().min}
                  onValueChange={(value) => {
                    setDraft((current) => {
                      const base = current ?? { min: props.minValue, max: props.maxValue };
                      return {
                        ...base,
                        min: clamp(Math.round(value), props.domainMin, props.domainMax),
                      };
                    });
                  }}
                  onValueCommitted={(value) => {
                    props.onMinCommit(clamp(Math.round(value), props.domainMin, props.domainMax));
                  }}
                />
              </Field>

              <Field class="min-w-0 w-full">
                <div class="flex w-full items-center justify-between gap-2">
                  <FieldLabel class="w-auto">Max</FieldLabel>
                  <span
                    class="shrink-0 font-normal text-foreground tabular-nums text-sm"
                    data-slot="field-value"
                  >
                    {String(Math.round(displayed().max))}
                  </span>
                </div>
                <Slider
                  aria-label="Maximum contrast"
                  class="w-full pt-0.5"
                  disabled={props.disabled}
                  max={props.domainMax}
                  min={props.domainMin}
                  step={1}
                  value={displayed().max}
                  onValueChange={(value) => {
                    setDraft((current) => {
                      const base = current ?? { min: props.minValue, max: props.maxValue };
                      return {
                        ...base,
                        max: clamp(Math.round(value), props.domainMin, props.domainMax),
                      };
                    });
                  }}
                  onValueCommitted={(value) => {
                    props.onMaxCommit(clamp(Math.round(value), props.domainMin, props.domainMax));
                  }}
                />
              </Field>
            </div>
          </div>
        </div>
      </Section>
    </Show>
  );
}
