import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip, ReadonlyPathField } from "@lisca/ui/shell";
import { stemName } from "@lisca/browser-frame";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";
import { DemoAnnotatorToolSection } from "./demo-annotator-tool-section";

export function DemoAnnotatorDock({ state }: { state: DemoAnnotatorState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";

  return (
    <DockStrip panels={2}>
      <DemoAnnotatorToolSection state={state} />
      <DockSection layout="2x2" title="Save">
        <ReadonlyPathField aria-label="Output annotation JSON" value={`${stem}.annotation.json`} />
        <ReadonlyPathField aria-label="Output mask PNG" value={`${stem}.mask.png`} />
        <Button
          className="col-span-2 w-full justify-center"
          disabled={!state.canSave}
          loading={state.saving}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.saveCurrent()}
        >
          Download
        </Button>
      </DockSection>
    </DockStrip>
  );
}
