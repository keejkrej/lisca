import { DockStrip } from "@lisca/ui/shell";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";
import { DemoAnnotatorSaveSection } from "./demo-annotator-save-section";
import { DemoAnnotatorToolSection } from "./demo-annotator-tool-section";

export function DemoAnnotatorDock({ state }: { state: DemoAnnotatorState }) {
  return (
    <DockStrip>
      <DemoAnnotatorToolSection state={state} />
      <DemoAnnotatorSaveSection state={state} />
    </DockStrip>
  );
}
