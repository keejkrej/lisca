"use client";

import { type AriaRole, useEffect, useState } from "react";

import { Button } from "./components/ui/button";
import { Slider } from "./components/ui/slider";
import { cn } from "./lib/utils";
import { Section } from "./section";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type ContrastWindow = {
  min: number;
  max: number;
};

export type ContrastControlProps = {
  domainMin: number;
  domainMax: number;
  minValue: number;
  maxValue: number;
  disabled?: boolean;
  onMinCommit: (value: number) => void;
  onMaxCommit: (value: number) => void;
  onAutoRange?: () => void;
  autoRangeDisabled?: boolean;
  /** Optional label above the controls inside the section (section title uses {@link sectionTitle}). */
  title?: string;
  className?: string;
  /** Section card title (default: Contrast). */
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  /** Passed to the enclosing Section card (e.g. region labeling). */
  "aria-label"?: string;
  role?: AriaRole;
};

/**
 * Renders in a {@link Section} card. Optional **title** inside the body before Auto Range.
 * Layout: **Auto Range** (optional) beside **Min** / **Max** sliders.
 */
export function ContrastControl(props: ContrastControlProps) {
  const {
    domainMin,
    domainMax,
    minValue,
    maxValue,
    disabled,
    onMinCommit,
    onMaxCommit,
    onAutoRange,
    autoRangeDisabled,
    title,
    className,
    sectionTitle = "Contrast",
    sectionDescription,
    sectionClassName,
    sectionContentClassName,
    "aria-label": ariaLabel,
    role,
  } = props;

  const domainOk = domainMax > domainMin;

  const [draft, setDraft] = useState<ContrastWindow | null>(null);

  useEffect(() => {
    setDraft({ min: minValue, max: maxValue });
  }, [minValue, maxValue]);

  const displayed = draft ?? { min: minValue, max: maxValue };

  if (!domainOk) {
    return (
      <Section
        aria-label={ariaLabel}
        contentClassName={sectionContentClassName}
        description={sectionDescription}
        title={sectionTitle}
        className={sectionClassName}
        role={role}
      >
        <div className={cn("min-h-0", className)}>
          <p className="text-muted-foreground text-xs">Invalid intensity domain.</p>
        </div>
      </Section>
    );
  }

  const sliderCol = "flex min-h-0 w-full min-w-0 flex-col gap-1";

  return (
    <Section
      aria-label={ariaLabel}
      contentClassName={sectionContentClassName}
      description={sectionDescription}
      title={sectionTitle}
      className={sectionClassName}
      role={role}
    >
      <div className={cn("flex w-full min-w-0 flex-col gap-3", className)}>
        {title?.trim() ? (
          <span className="shrink-0 font-medium text-foreground text-sm">{title.trim()}</span>
        ) : null}

        <div className="flex w-full min-w-0 flex-row flex-wrap items-center gap-x-4 gap-y-3">
          {onAutoRange ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || autoRangeDisabled}
              className="h-8 shrink-0 px-2.5 text-xs"
              onClick={onAutoRange}
            >
              Auto Range
            </Button>
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <div className={sliderCol}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Min</span>
                <span className="text-xs text-muted-foreground/80 tabular-nums">
                  {String(Math.round(displayed.min))}
                </span>
              </div>
              <Slider
                className="w-full pt-0.5"
                disabled={disabled}
                max={domainMax}
                min={domainMin}
                step={1}
                value={displayed.min}
                onValueChange={(value) => {
                  setDraft((current) => {
                    const base = current ?? { min: minValue, max: maxValue };
                    return {
                      ...base,
                      min: clamp(Math.round(value), domainMin, domainMax),
                    };
                  });
                }}
                onValueCommitted={(value) => {
                  onMinCommit(clamp(Math.round(value), domainMin, domainMax));
                }}
              />
            </div>

            <div className={sliderCol}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Max</span>
                <span className="text-xs text-muted-foreground/80 tabular-nums">
                  {String(Math.round(displayed.max))}
                </span>
              </div>
              <Slider
                className="w-full pt-0.5"
                disabled={disabled}
                max={domainMax}
                min={domainMin}
                step={1}
                value={displayed.max}
                onValueChange={(value) => {
                  setDraft((current) => {
                    const base = current ?? { min: minValue, max: maxValue };
                    return {
                      ...base,
                      max: clamp(Math.round(value), domainMin, domainMax),
                    };
                  });
                }}
                onValueCommitted={(value) => {
                  onMaxCommit(clamp(Math.round(value), domainMin, domainMax));
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
