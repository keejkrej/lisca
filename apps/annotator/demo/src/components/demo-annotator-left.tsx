import { ContrastControl } from "@lisca/ui/features";

import type { DemoAnnotatorState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAnnotatorLeft(props: { state: Accessor<DemoAnnotatorState> }) {
  return (
    <div class="flex min-h-0 flex-col gap-2 p-3">
      <ContrastControl
        aria-label="Contrast"
        contrast={props.state().contrast}
        disabled={!props.state().frame}
        frame={props.state().frame}
        role="region"
        onContrastChange={props.state().setContrast}
      />
    </div>
  );
}