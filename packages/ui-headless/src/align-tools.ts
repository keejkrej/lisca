import type { AlignGridToolMode } from "@lisca/utils";

import type { DockToolAction } from "./dock";

export type AlignToolDefinition = {
  mode: AlignGridToolMode;
  label: string;
};

export const alignToolDefinitions: AlignToolDefinition[] = [
  { mode: "pan", label: "Pan" },
  { mode: "rotate", label: "Rotate" },
  { mode: "zoom-vector", label: "Zoom vector" },
  { mode: "zoom-pattern", label: "Zoom pattern" },
];

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
