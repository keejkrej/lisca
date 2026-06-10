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

import { Button } from "../../components/ui/button";
import { DockSection } from "../../shell/regions/dock-section";
import {
  dockToolLabel,
  dockToolShortcuts,
  useKeyboardShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";

export type AlignToolSectionProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  patternZoomLocked?: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  shortcutsEnabled?: boolean;
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
      className={className ?? "w-full min-w-0 justify-center gap-2 px-3"}
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

export function buildAlignToolActions(
  mode: AlignGridToolMode,
  onModeChange: (mode: AlignGridToolMode) => void,
): DockToolAction[] {
  return alignToolDefinitions.map(({ mode: toolMode, label }) => ({
    id: toolMode,
    label,
    active: mode === toolMode,
    onSelect: () => onModeChange(toolMode),
  }));
}

function renderAlignToolCell(
  tool: (typeof alignToolDefinitions)[number],
  index: number,
  mode: AlignGridToolMode,
  onModeChange: (mode: AlignGridToolMode) => void,
  patternZoomLocked: boolean,
  onPatternZoomLockedChange?: (locked: boolean) => void,
) {
  const shortcutLabel = dockToolLabel(tool.label, index);
  if (tool.mode === "zoom-pattern") {
    return (
      <div key={tool.mode} className="min-w-0">
        <div className="grid min-w-0 grid-cols-[1fr_2rem] gap-1">
          <AlignToolButton
            active={mode === tool.mode}
            className="w-full min-w-0 justify-center gap-2 px-2"
            Icon={tool.Icon}
            label={shortcutLabel}
            mode={tool.mode}
            onClick={() => onModeChange(tool.mode)}
          />
          <Button
            aria-label={patternZoomLocked ? "Unlock pattern zoom" : "Lock pattern zoom"}
            aria-pressed={patternZoomLocked}
            className="w-full px-0"
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
      </div>
    );
  }

  return (
    <div key={tool.mode} className="min-w-0">
      <AlignToolButton
        active={mode === tool.mode}
        Icon={tool.Icon}
        label={shortcutLabel}
        mode={tool.mode}
        onClick={() => onModeChange(tool.mode)}
      />
    </div>
  );
}

export type AlignToolToolbarProps = Pick<
  AlignToolSectionProps,
  | "mode"
  | "onModeChange"
  | "patternZoomLocked"
  | "onPatternZoomLockedChange"
  | "shortcutsEnabled"
>;

export function AlignToolToolbar({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
  shortcutsEnabled = true,
}: AlignToolToolbarProps) {
  const toolActions = buildAlignToolActions(mode, onModeChange);
  useKeyboardShortcuts(dockToolShortcuts(toolActions), { enabled: shortcutsEnabled });

  const cells = alignToolDefinitions.map((tool, index) =>
    renderAlignToolCell(
      tool,
      index,
      mode,
      onModeChange,
      patternZoomLocked,
      onPatternZoomLockedChange,
    ),
  );

  return (
    <div aria-label="Align canvas tool" className="flex w-full flex-col gap-2" role="toolbar">
      <div className="grid w-full grid-cols-2 gap-2">
        {cells[0]}
        {cells[1]}
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        {cells[2]}
        {cells[3]}
      </div>
    </div>
  );
}

export function AlignToolSection({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
  sectionTitle = "Tool",
  sectionDescription,
  sectionClassName,
  sectionContentClassName,
  shortcutsEnabled = true,
}: AlignToolSectionProps) {
  return (
    <DockSection
      className={sectionClassName}
      contentClassName={sectionContentClassName}
      description={sectionDescription}
      title={sectionTitle}
    >
      <AlignToolToolbar
        mode={mode}
        patternZoomLocked={patternZoomLocked}
        shortcutsEnabled={shortcutsEnabled}
        onModeChange={onModeChange}
        onPatternZoomLockedChange={onPatternZoomLockedChange}
      />
    </DockSection>
  );
}
