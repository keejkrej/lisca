import { Button } from "@lisca/ui/components";
import { dockSaveGrid3Class, dockSectionClass, ReadonlyPathField, Section } from "@lisca/ui/shell";

import { useAlignCrop, useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();
  const crop = useAlignCrop();
  const pos = nav.selection.pos;
  const canSave = Boolean(nav.workspacePath && nav.frame && !crop.cropping);
  const canCrop = Boolean(nav.workspacePath && nav.source && nav.frame && !crop.cropping);

  return (
    <Section className={dockSectionClass} contentClassName={dockSaveGrid3Class} title="Save">
      <ReadonlyPathField
        aria-label={`Output path bbox/Pos${pos}.csv`}
        value={`bbox/Pos${pos}.csv`}
      />
      <ReadonlyPathField
        aria-label={`Output path align/Pos${pos}.json`}
        value={`align/Pos${pos}.json`}
      />
      <ReadonlyPathField
        className="text-center"
        aria-label={`Output path roi/Pos${pos}`}
        value={`roi/Pos${pos}`}
      />
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
    </Section>
  );
}
