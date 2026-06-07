import type { AlignState } from "../state/use-align-state";
import { AlignSaveSection } from "./align-save-section";
import { AlignToolSection } from "./align-tool-section";

export function AlignerDock(props: { alignState: AlignState }) {
  return (
    <div className="flex h-full min-h-0 w-full gap-3 p-3">
      <AlignToolSection state={props.alignState} />
      <AlignSaveSection state={props.alignState} />
    </div>
  );
}
