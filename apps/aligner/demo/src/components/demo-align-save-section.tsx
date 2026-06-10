import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";
import { stemName } from "@lisca/browser-frame";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignSaveSection({ state }: { state: DemoAlignState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";
  const canSave = Boolean(state.frame);

  return (
    <DockSection title="Save">
      <div className="flex w-full flex-col gap-2">
        <div className="grid w-full grid-cols-2 gap-2">
          <div className="min-w-0">
            <ReadonlyPathField aria-label="Output bbox CSV" value={`${stem}.bbox.csv`} />
          </div>
          <div className="min-w-0">
            <ReadonlyPathField aria-label="Output align JSON" value={`${stem}.align.json`} />
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <div className="col-span-2 min-w-0">
            <Button
              className="w-full justify-center"
              disabled={!canSave || state.saving}
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
  );
}
