"use client";

import { ArrowLeftRight, Move, RotateCw, SquareDashedMousePointer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AlignGridToolMode } from "@lisca/utils";

import { Button } from "../components/ui/button";
import { Section } from "../shell/section";

export type AlignToolsProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
};

const alignTools: {
  mode: AlignGridToolMode;
  label: string;
  Icon: LucideIcon;
}[] = [
  { mode: "pan", label: "Pan", Icon: Move },
  { mode: "rotate", label: "Rotate", Icon: RotateCw },
  { mode: "zoom-vector", label: "Zoom vector", Icon: ArrowLeftRight },
  { mode: "zoom-pattern", label: "Zoom pattern", Icon: SquareDashedMousePointer },
];

export function AlignTools({
  mode,
  onModeChange,
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
        {alignTools.map(({ mode: toolMode, label, Icon }) => (
          <Button
            key={toolMode}
            aria-pressed={mode === toolMode}
            aria-label={label}
            className="h-full w-full min-w-0 justify-center gap-2 px-3"
            size="sm"
            title={label}
            type="button"
            variant={mode === toolMode ? "default" : "outline"}
            onClick={() => onModeChange(toolMode)}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span className="max-w-full truncate text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </Section>
  );
}
