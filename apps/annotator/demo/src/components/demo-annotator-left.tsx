import { ContrastControl } from "@lisca/ui/features";
import { SidebarStack } from "@lisca/ui/shell";

import type { DemoAnnotatorState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAnnotatorLeft(props: { state: Accessor<DemoAnnotatorState> }) {
  return (
    <SidebarStack>
      <ContrastControl
        aria-label="Contrast"
        contrast={props.state().contrast}
        disabled={!props.state().frame}
        frame={props.state().frame}
        role="region"
        onContrastChange={props.state().setContrast}
      />
    </SidebarStack>
  );
}