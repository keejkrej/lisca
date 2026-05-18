import { Button, Section } from "@lisca/ui";

import type { AlignState } from "../state/use-align-state";
import { OutputPathField } from "./output-path-field";

export function AlignSaveSection({ state }: { state: AlignState }) {
  const pos = state.selection.pos;
  const canSave = Boolean(state.workspacePath && state.frame && !state.cropping);
  const canCrop = Boolean(state.workspacePath && state.source && state.frame && !state.cropping);

  return (
    <Section
      className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col"
      contentClassName="flex min-h-0 flex-col gap-2"
      title="Save"
    >
      <div className="grid min-w-0 grid-cols-3 gap-2">
        <OutputPathField value={`bbox/Pos${pos}.csv`} />
        <OutputPathField value={`align/Pos${pos}.json`} />
        <OutputPathField value={`roi/Pos${pos}`} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          className="w-full justify-center"
          disabled={!canSave || state.saving}
          loading={state.saving}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.saveCurrent()}
        >
          Save
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!canCrop}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.cropCurrent()}
        >
          Crop
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!state.workspacePath || !state.source || state.cropping}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void state.cropBatch()}
        >
          Batch
        </Button>
      </div>
    </Section>
  );
}
