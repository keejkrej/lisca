import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";

import { useAlignCrop, useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();
  const crop = useAlignCrop();
  const pos = nav.selection.pos;
  const canSave = Boolean(nav.workspacePath && nav.frame && !crop.cropping);
  const canCrop = Boolean(nav.workspacePath && nav.source && nav.frame && !crop.cropping);

  return (
    <DockSection title="Save">
      <div className="flex w-full flex-col gap-2">
        <div className="grid w-full grid-cols-3 gap-2">
          <div className="min-w-0">
            <ReadonlyPathField
              aria-label={`Output path bbox/Pos${pos}.csv`}
              value={`bbox/Pos${pos}.csv`}
            />
          </div>
          <div className="min-w-0">
            <ReadonlyPathField
              aria-label={`Output path align/Pos${pos}.json`}
              value={`align/Pos${pos}.json`}
            />
          </div>
          <div className="min-w-0">
            <ReadonlyPathField
              className="text-center"
              aria-label={`Output path roi/Pos${pos}`}
              value={`roi/Pos${pos}`}
            />
          </div>
        </div>
        <div className="grid w-full grid-cols-3 gap-2">
          <div className="min-w-0">
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
          </div>
          <div className="min-w-0">
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
          </div>
          <div className="min-w-0">
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
        </div>
      </div>
    </DockSection>
  );
}
