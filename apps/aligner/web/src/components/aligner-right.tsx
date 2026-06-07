import type { AlignState } from "../state/use-align-state";
import { AlignGridControls } from "./align-grid-controls";
import { AlignSelectionControls } from "./align-selection-controls";

export function AlignerRight(props: { alignState: AlignState }) {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <AlignGridControls state={props.alignState} />
      <AlignSelectionControls state={props.alignState} />
    </div>
  );
}
