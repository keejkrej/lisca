import { AlignGridControls } from "./align-grid-controls";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight() {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <AlignGridControls />
      <AlignSelectionControls />
    </div>
  );
}
