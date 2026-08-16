import { DockStrip } from "@lisca/ui/shell";
import type { Accessor } from "solid-js";

import type { DemoAnnotatorState } from "@lisca/web-demo";
import { DemoAnnotatorSaveSection } from "./demo-annotator-save-section";
import { DemoAnnotatorToolSection } from "./demo-annotator-tool-section";

export function DemoAnnotatorDock(props: { state: Accessor<DemoAnnotatorState> }) {
  return (
    <DockStrip>
      <DemoAnnotatorToolSection state={props.state} />
      <DemoAnnotatorSaveSection state={props.state} />
    </DockStrip>
  );
}
