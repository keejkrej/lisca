import { cn, shellRailChromeClass } from "@lisca/ui";

import type { AlignState } from "../state/use-align-state";
import { AlignContrastControls } from "./align-contrast-controls";
import { AlignFrameNavigation } from "./align-frame-navigation";

export function AlignerLeft(props: { alignState: AlignState }) {
  return (
    <div className={cn("flex min-h-0 flex-col gap-2 p-3", shellRailChromeClass)}>
      <AlignFrameNavigation state={props.alignState} />
      <AlignContrastControls state={props.alignState} />
    </div>
  );
}
