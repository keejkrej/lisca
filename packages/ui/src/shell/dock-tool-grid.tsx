"use client";

import { memo, type ReactNode } from "react";

import { DockButton } from "./dock-button";
import { dockToolLabel, useDockToolShortcuts, type DockToolAction } from "./dock-tool-shortcuts";

const DockToolGridItem = memo(function DockToolGridItem({
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
});

export type DockToolGridProps = {
  actions: readonly DockToolAction[];
  enabled?: boolean;
  className?: string;
  columns?: 1 | 2;
  renderAction?: (action: DockToolAction, index: number, label: string) => ReactNode;
};

export function DockToolGrid({
  actions,
  enabled = true,
  className,
  columns = 2,
  renderAction,
}: DockToolGridProps) {
  useDockToolShortcuts(actions, { enabled });

  return (
    <div
      aria-label="Tool shortcuts"
      className={
        className ??
        (columns === 2
          ? "grid min-h-0 flex-1 grid-cols-2 gap-2"
          : "grid min-h-0 flex-1 grid-cols-1 gap-2")
      }
      role="toolbar"
    >
      {actions.map((action, index) => {
        const label = dockToolLabel(action.label, index);
        if (renderAction) {
          return <div key={action.id}>{renderAction(action, index, label)}</div>;
        }
        return (
          <div key={action.id}>
            <DockToolGridItem action={action} label={label} />
          </div>
        );
      })}
    </div>
  );
}
