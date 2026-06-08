import { Button } from "@lisca/ui/components";
import { dockSaveGrid2Class, dockSectionClass, ReadonlyPathField, Section } from "@lisca/ui/shell";
import { stemName } from "@lisca/browser-frame";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignSaveSection({ state }: { state: DemoAlignState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";
  const canSave = Boolean(state.frame);

  return (
    <Section className={dockSectionClass} contentClassName={dockSaveGrid2Class} title="Save">
      <ReadonlyPathField aria-label="Output bbox CSV" value={`${stem}.bbox.csv`} />
      <ReadonlyPathField aria-label="Output align JSON" value={`${stem}.align.json`} />
      <Button
        className="col-span-2 w-full justify-center"
        disabled={!canSave || state.saving}
        loading={state.saving}
        size="sm"
        type="button"
        variant="outline"
        onClick={() => void state.saveCurrent()}
      >
        Download
      </Button>
    </Section>
  );
}
