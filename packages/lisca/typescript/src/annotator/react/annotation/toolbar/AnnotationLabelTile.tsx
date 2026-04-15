import type { AnnotationLabel } from "lisca/shared/contracts";
import { cn } from "lisca/shared/ui";

import { colorStyle } from "../annotationUtils";

/** Shared with label manager modal so configure tiles match sidebar chips */
export const annotationLabelTileClass =
  "flex h-8 min-w-0 w-full shrink-0 items-center justify-center rounded-lg border px-3 text-center text-xs font-medium transition-colors";

/** Label chip — `colorStyle` border / fill / text; stronger when `selected`. */
export function AnnotationLabelSelectTile({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: AnnotationLabel;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      title={label.name}
      className={cn(annotationLabelTileClass, "disabled:cursor-not-allowed disabled:opacity-50")}
      style={colorStyle(label.color, selected)}
      onClick={onClick}
    >
      <span className="min-w-0 w-full truncate text-center">{label.name}</span>
    </button>
  );
}
