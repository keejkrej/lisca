"use client";

import {
  ArrowLeftRight,
  Lock,
  Move,
  RotateCw,
  SquareDashedMousePointer,
  Unlock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AlignGridToolMode } from "@lisca/utils";

import { Button } from "../components/ui/button";
import { Section } from "../shell/section";

export type AlignToolsProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  patternZoomLocked?: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
};

export const alignToolDefinitions: {
  mode: AlignGridToolMode;
  label: string;
  Icon: LucideIcon;
}[] = [
  { mode: "pan", label: "Pan", Icon: Move },
  { mode: "rotate", label: "Rotate", Icon: RotateCw },
  { mode: "zoom-vector", label: "Zoom vector", Icon: ArrowLeftRight },
  { mode: "zoom-pattern", label: "Zoom pattern", Icon: SquareDashedMousePointer },
];

export function AlignToolButton(props: {
  mode: AlignGridToolMode;
  active: boolean;
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  className?: string;
}) {
  const { mode, active, label, Icon, onClick, className } = props;
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className={className ?? "h-full w-full min-w-0 justify-center gap-2 px-3"}
      key={mode}
      size="sm"
      title={label}
      type="button"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-5" />
      <span className="max-w-full truncate text-xs">{label}</span>
    </Button>
  );
}

export function AlignTools({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
  sectionTitle = "Tools",
  sectionDescription,
  sectionClassName,
  sectionContentClassName,
}: AlignToolsProps) {
  return (
    <Section
      className={sectionClassName}
      contentClassName={sectionContentClassName}
      description={sectionDescription}
      title={sectionTitle}
    >
      <div
        aria-label="Align canvas tool"
        className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2"
        role="toolbar"
      >
        {alignToolDefinitions.map(({ mode: toolMode, label, Icon }) =>
          toolMode === "zoom-pattern" ? (
            <div key={toolMode} className="grid min-h-0 min-w-0 grid-cols-[1fr_2rem] gap-1">
              <AlignToolButton
                active={mode === toolMode}
                className="h-full w-full min-w-0 justify-center gap-2 px-2"
                Icon={Icon}
                label={label}
                mode={toolMode}
                onClick={() => onModeChange(toolMode)}
              />
              <Button
                aria-label={patternZoomLocked ? "Unlock pattern zoom" : "Lock pattern zoom"}
                aria-pressed={patternZoomLocked}
                className="h-full w-full px-0"
                disabled={!onPatternZoomLockedChange}
                size="sm"
                title={patternZoomLocked ? "Unlock pattern zoom" : "Lock pattern zoom"}
                type="button"
                variant={patternZoomLocked ? "default" : "outline"}
                onClick={() => onPatternZoomLockedChange?.(!patternZoomLocked)}
              >
                {patternZoomLocked ? (
                  <Lock aria-hidden="true" className="size-4" />
                ) : (
                  <Unlock aria-hidden="true" className="size-4" />
                )}
              </Button>
            </div>
          ) : (
            <AlignToolButton
              key={toolMode}
              active={mode === toolMode}
              Icon={Icon}
              label={label}
              mode={toolMode}
              onClick={() => onModeChange(toolMode)}
            />
          ),
        )}
      </div>
    </Section>
  );
}
