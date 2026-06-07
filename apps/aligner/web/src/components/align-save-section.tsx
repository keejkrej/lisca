import { Button, ReadonlyPathField, Section } from "@lisca/ui";

import { useAlignPage } from "../state/align-page-context";

export function AlignSaveSection() {
  const { state } = useAlignPage();
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
        <ReadonlyPathField
          aria-label={`Output path bbox/Pos${pos}.csv`}
          value={`bbox/Pos${pos}.csv`}
        />
        <ReadonlyPathField
          aria-label={`Output path align/Pos${pos}.json`}
          value={`align/Pos${pos}.json`}
        />
        <ReadonlyPathField aria-label={`Output path roi/Pos${pos}`} value={`roi/Pos${pos}`} />
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
