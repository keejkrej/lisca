import { Button } from "@lisca/ui/components";
import { DockSection, DockStrip, ReadonlyPathField } from "@lisca/ui/shell";
import { stemName } from "@lisca/browser-frame";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";
import { DemoAnnotatorToolSection } from "./demo-annotator-tool-section";

export function DemoAnnotatorDock({ state }: { state: DemoAnnotatorState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";

  return (
    <DockStrip>
      <DemoAnnotatorToolSection state={state} />
      <DockSection title="Save">
        <div className="flex w-full flex-col gap-2">
          <div className="grid w-full grid-cols-2 gap-2">
            <div className="min-w-0">
              <ReadonlyPathField aria-label="Output annotation JSON" value={`${stem}.annotation.json`} />
            </div>
            <div className="min-w-0">
              <ReadonlyPathField aria-label="Output mask PNG" value={`${stem}.mask.png`} />
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <div className="col-span-2 min-w-0">
              <Button
                className="w-full justify-center"
                disabled={!state.canSave}
                loading={state.saving}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => void state.saveCurrent()}
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      </DockSection>
    </DockStrip>
  );
}
