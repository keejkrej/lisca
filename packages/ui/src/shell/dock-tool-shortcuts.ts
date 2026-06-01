"use client";

import { useEffect } from "react";

export type DockToolAction = {
  id: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onSelect: () => void;
};

export function dockToolLabel(label: string, index: number): string {
  return `${label} (${index + 1})`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function useDockToolShortcuts(
  actions: readonly DockToolAction[],
  options?: { enabled?: boolean },
): void {
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled || actions.length === 0) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const digit = Number(event.key);
      if (!Number.isInteger(digit) || digit < 1 || digit > 9) return;

      const action = actions[digit - 1];
      if (!action || action.disabled) return;

      event.preventDefault();
      action.onSelect();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, enabled]);
}
