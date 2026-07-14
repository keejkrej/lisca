import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";

import { useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();
  const pos = nav.selection.pos;
  const canSave = Boolean(nav.workspacePath && nav.frame);
  const canCrop = Boolean(nav.workspacePath && nav.source && nav.frame);

  return (
    <DockSection title="Save">
      <div class="flex w-full flex-col gap-2">
        <div class="grid w-full grid-cols-3 gap-2">
          <div class="min-w-0">
            <ReadonlyPathField
              aria-label={`Output path bbox/Pos${pos}.csv`}
              value={`bbox/Pos${pos}.csv`}
            />
          </div>
          <div class="min-w-0">
            <ReadonlyPathField
              aria-label={`Output path align/Pos${pos}.json`}
              value={`align/Pos${pos}.json`}
            />
          </div>
          <div class="min-w-0">
            <ReadonlyPathField
              class="text-center"
              aria-label={`Output path roi/Pos${pos}`}
              value={`roi/Pos${pos}`}
            />
          </div>
        </div>
        <div class="grid w-full grid-cols-3 gap-2">
          <div class="min-w-0">
            <Button
              class="w-full justify-center"
              disabled={!canSave || nav.saving}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void nav.saveCurrent()}
            >
              Save
            </Button>
          </div>
          <div class="min-w-0">
            <Button
              class="w-full justify-center"
              disabled={!canCrop}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void nav.cropCurrent()}
            >
              Crop
            </Button>
          </div>
          <div class="min-w-0">
            <Button
              class="w-full justify-center"
              disabled={!nav.workspacePath || !nav.source}
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
