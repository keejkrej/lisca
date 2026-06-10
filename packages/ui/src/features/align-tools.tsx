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
import { DockGrid } from "../shell/dock-grid";
import { DockSection } from "../shell/dock-section";
import {
  dockToolLabel,
  useDockToolShortcuts,
  type DockToolAction,
} from "../shell/dock-tool-shortcuts";

export type AlignToolsProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  patternZoomLocked?: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionClassName?: string;
  sectionContentClassName?: string;
  /** When true, render only the toolbar (no surrounding {@link Section}). */
  bare?: boolean;
  /** When false, number-key shortcuts are disabled. */
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
      <div key={tool.mode} className="grid min-w-0 grid-cols-[1fr_2rem] gap-1">
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
    );
  }

  return (
    <AlignToolButton
      key={tool.mode}
      active={mode === tool.mode}
      Icon={tool.Icon}
      label={shortcutLabel}
      mode={tool.mode}
      onClick={() => onModeChange(tool.mode)}
    />
  );
}

export function AlignTools({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
  sectionTitle = "Tool",
  sectionDescription,
  sectionClassName,
  sectionContentClassName,
  bare = false,
  shortcutsEnabled = true,
}: AlignToolsProps) {
  const toolActions = buildAlignToolActions(mode, onModeChange);
  useDockToolShortcuts(toolActions, { enabled: shortcutsEnabled });

  const toolbarCells = alignToolDefinitions.map((tool, index) =>
    renderAlignToolCell(
      tool,
      index,
      mode,
      onModeChange,
      patternZoomLocked,
      onPatternZoomLockedChange,
    ),
  );

  const toolbar = (
    <DockGrid aria-label="Align canvas tool" layout="2x2" role="toolbar">
      {toolbarCells}
    </DockGrid>
  );

  if (bare) {
    return <div className={sectionClassName}>{toolbar}</div>;
  }

  return (
    <DockSection
      className={sectionClassName}
      contentClassName={sectionContentClassName}
      description={sectionDescription}
      layout="2x2"
      gridProps={{ "aria-label": "Align canvas tool", role: "toolbar" }}
      title={sectionTitle}
    >
      {toolbarCells}
    </DockSection>
  );
}
