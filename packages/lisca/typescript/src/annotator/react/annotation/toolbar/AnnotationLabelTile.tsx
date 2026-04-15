import type { AnnotationLabel } from "lisca/viewer/contracts";
import { cn } from "lisca/viewer/ui";

import { colorStyle } from "../annotationUtils";

const tileClass =
  "flex min-w-0 w-full items-center rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors";

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
      className={cn(tileClass, "disabled:cursor-not-allowed disabled:opacity-50")}
      style={colorStyle(label.color, selected)}
      onClick={onClick}
    >
      <span className="min-w-0 truncate">{label.name}</span>
    </button>
  );
}
