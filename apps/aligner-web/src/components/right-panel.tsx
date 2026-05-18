import type { AlignState } from "../state/use-align-state";
import { AlignGridPanel } from "./align-grid-panel";
import { AlignSelectionPanel } from "./align-selection-panel";

export function RightPanel(props: { alignState: AlignState }) {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3">
      <AlignGridPanel state={props.alignState} />
      <AlignSelectionPanel state={props.alignState} />
    </div>
  );
}
