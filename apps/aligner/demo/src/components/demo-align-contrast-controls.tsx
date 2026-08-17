import { ContrastControl } from "@lisca/ui/features";

import type { DemoAlignState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAlignContrastControls(props: { state: Accessor<DemoAlignState> }) {
  return (
    <ContrastControl
      aria-label="Contrast"
      contrast={props.state().contrast}
      disabled={!props.state().frame}
      frame={props.state().frame}
      role="region"
      sectionAppearance="rail"
      sectionClassName="min-h-0 shrink-0"
      sectionContentClassName="flex min-h-0 flex-col"
      onContrastChange={props.state().setContrast}
    />
  );
}
