import type { ContrastWindow } from "@lisca/contracts";
import type { FrameResult } from "@lisca/utils";
import { clamp, deriveContrastControlState } from "@lisca/utils";
import { createEffect, createSignal, Show, type JSX } from "solid-js";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Slider } from "../../components/ui/slider";
import { cn } from "../../lib/utils";
import { Section } from "../../shell/regions/section";

export type { ContrastWindow };

export type ContrastControlProps = {
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  onContrastChange: (contrast: ContrastWindow | null) => void;
  disabled?: boolean;
  title?: string;
  class?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  "aria-label"?: string;
  role?: JSX.AriaAttributes["role"];
};

/**
 * Renders in a {@link Section} card. Optional **title** inside the body before Auto Range.
 * Layout: **Auto Range** (optional) beside **Min** / **Max** sliders.
 */
export function ContrastControl(props: ContrastControlProps) {
  const controlState = () => {
    const { domain, suggestedContrast, value } = deriveContrastControlState(
      props.frame,
      props.contrast,
    );
    const disabled = props.disabled ?? !props.frame;
    return {
      domainMin: domain.min,
      domainMax: domain.max,
      minValue: value.min,
      maxValue: value.max,
      disabled,
      autoRangeDisabled: disabled,
      onAutoRange: () => props.onContrastChange(suggestedContrast),
      onMinCommit: (min: number) => props.onContrastChange({ min, max: value.max }),
      onMaxCommit: (max: number) => props.onContrastChange({ min: value.min, max }),
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
      maxValue={controlState().maxValue}
      minValue={controlState().minValue}
      role={props.role}
      sectionClassName={props.sectionClassName}
      sectionContentClassName={props.sectionContentClassName}
      sectionDescription={props.sectionDescription}
      sectionTitle={props.sectionTitle}
      title={props.title}
      onAutoRange={controlState().onAutoRange}
      onMaxCommit={controlState().onMaxCommit}
      onMinCommit={controlState().onMinCommit}
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
  onAutoRange: () => void;
  onMinCommit: (min: number) => void;
  onMaxCommit: (max: number) => void;
  title?: string;
  class?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
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
          aria-label={props["aria-label"]}
          contentClassName={props.sectionContentClassName}
          description={props.sectionDescription}
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
        aria-label={props["aria-label"]}
        contentClassName={props.sectionContentClassName}
        description={props.sectionDescription}
        title={props.sectionTitle ?? "Contrast"}
        class={props.sectionClassName}
        role={props.role}
      >
        <div class={cn("flex w-full min-w-0 flex-col gap-3", props.class)}>
          <Show when={props.title?.trim()}>
            <span class="shrink-0 font-medium text-foreground text-sm">{props.title!.trim()}</span>
          </Show>

          <div class="flex w-full min-w-0 flex-col gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={props.disabled || props.autoRangeDisabled}
              class="h-8 w-full justify-center px-2.5 text-xs"
              onClick={props.onAutoRange}
            >
              Auto Range
            </Button>

            <div class="flex min-h-0 min-w-0 flex-col gap-3">
              <Field class="min-w-0 w-full">
                <div class="flex w-full items-center justify-between gap-2">
                  <FieldLabel class="w-auto">Min</FieldLabel>
                  <span class="shrink-0 font-normal text-muted-foreground/80 tabular-nums text-sm">
                    {String(Math.round(displayed().min))}
                  </span>
                </div>
                <Slider
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
                  <span class="shrink-0 font-normal text-muted-foreground/80 tabular-nums text-sm">
                    {String(Math.round(displayed().max))}
                  </span>
                </div>
                <Slider
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