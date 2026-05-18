import type { AlignState } from "../state/use-align-state";
import { AlignFrameNavigation } from "./align-frame-navigation";
import { DockContrastControls } from "./dock-contrast-controls";

export function LeftPanel(props: { alignState: AlignState }) {
  return (
    <div className="flex min-h-0 flex-col gap-2 p-3">
      <AlignFrameNavigation state={props.alignState} />
      <DockContrastControls state={props.alignState} />
    </div>
  );
}
