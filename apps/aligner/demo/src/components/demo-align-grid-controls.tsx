import { AlignGridRail } from "@lisca/ui/features";

import type { DemoAlignState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAlignGridControls(props: { state: Accessor<DemoAlignState> }) {
  return (
    <AlignGridRail
      disabled={!props.state().frame}
      grid={props.state().grid}
      onGridChange={props.state().setGrid}
    />
  );
}