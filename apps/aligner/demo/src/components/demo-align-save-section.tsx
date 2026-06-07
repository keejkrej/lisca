import { Button, ReadonlyPathField, Section } from "@lisca/ui";
import { stemName } from "@lisca/browser-frame";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignSaveSection({ state }: { state: DemoAlignState }) {
  const stem = state.fileName ? stemName(state.fileName) : "image";
  const canSave = Boolean(state.frame);

  return (
    <Section
      className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      contentClassName="flex min-h-0 flex-col gap-2"
      title="Save"
    >
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <ReadonlyPathField aria-label="Output bbox CSV" value={`${stem}.bbox.csv`} />
        <ReadonlyPathField aria-label="Output align JSON" value={`${stem}.align.json`} />
      </div>
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
    </Section>
  );
}
