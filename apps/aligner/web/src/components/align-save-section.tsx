import { Button } from "@lisca/ui/components";
import { dockSectionClass, ReadonlyPathField, Section } from "@lisca/ui/shell";

import { useAlignCrop, useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();
  const crop = useAlignCrop();
  const pos = nav.selection.pos;
  const canSave = Boolean(nav.workspacePath && nav.frame && !crop.cropping);
  const canCrop = Boolean(nav.workspacePath && nav.source && nav.frame && !crop.cropping);

  return (
    <Section
      className={dockSectionClass}
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
          disabled={!canSave || nav.saving}
          loading={nav.saving}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void nav.saveCurrent()}
        >
          Save
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!canCrop}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void nav.cropCurrent()}
        >
          Crop
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!nav.workspacePath || !nav.source || crop.cropping}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void nav.cropBatch()}
        >
          Batch
        </Button>
      </div>
    </Section>
  );
}
