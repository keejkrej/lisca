"use client";

import { type ReactNode } from "react";
import { DockButton } from "./dock-button";
import { DockGrid } from "./dock-grid";
import { dockToolLabel, useDockToolShortcuts, type DockToolAction } from "./dock-tool-shortcuts";
const DockToolGridItem = function DockToolGridItem({
  action,
  label,
}: {
  action: DockToolAction;
  label: string;
}) {
  return (
    <DockButton active={action.active} disabled={action.disabled} onClick={action.onSelect}>
      {label}
    </DockButton>
  );
};
export type DockToolGridProps = {
  actions: readonly DockToolAction[];
  enabled?: boolean;
  className?: string;
  /** Compact centered grid for studio tool sections. */
  centered?: boolean;
  renderAction?: (action: DockToolAction, index: number, label: string) => ReactNode;
};
export function DockToolGrid({
  actions,
  enabled = true,
  className,
  centered = false,
  renderAction,
}: DockToolGridProps) {
  useDockToolShortcuts(actions, {
    enabled,
  });
  const cells = actions.map((action, index) => {
    const label = dockToolLabel(action.label, index);
    if (renderAction) {
      return <div key={action.id}>{renderAction(action, index, label)}</div>;
    }
    return <DockToolGridItem key={action.id} action={action} label={label} />;
  });
  if (centered) {
    return (
      <DockGrid
        aria-label="Tool shortcuts"
        centered
        className={className}
        layout="2x1"
        role="toolbar"
      >
        {cells}
      </DockGrid>
    );
  }
  return (
    <div
      aria-label="Tool shortcuts"
      className={className ?? "grid min-h-0 flex-1 grid-cols-1 gap-2"}
      role="toolbar"
    >
      {cells}
    </div>
  );
}
