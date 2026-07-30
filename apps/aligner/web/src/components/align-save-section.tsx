import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";

import { useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();

  // Read workspace/source/frame inside JSX (or getters) so Solid tracks them.
  // A one-shot `const canSave = Boolean(...)` freezes the mount-time nulls
  // and leaves Save/Crop disabled after the frame loads.
  return (
    <DockSection title="Save">
      <div class="flex w-full flex-col gap-2">
        <div class="grid w-full grid-cols-3 gap-2">
          <div class="min-w-0">
            <ReadonlyPathField
              aria-label={`Output path bbox/Pos${nav.selection.pos}.csv`}
              value={`bbox/Pos${nav.selection.pos}.csv`}
            />
          </div>
          <div class="min-w-0">
            <ReadonlyPathField
              aria-label={`Output path align/Pos${nav.selection.pos}.json`}
              value={`align/Pos${nav.selection.pos}.json`}
            />
          </div>
          <div class="min-w-0">
            <ReadonlyPathField
              class="text-center"
              aria-label={`Output path roi/Pos${nav.selection.pos}`}
              value={`roi/Pos${nav.selection.pos}`}
            />
          </div>
        </div>
        <div class="grid w-full grid-cols-3 gap-2">
          <div class="min-w-0">
            <Button
              class="w-full justify-center"
              disabled={!nav.workspacePath || !nav.frame || nav.saving}
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
              disabled={!nav.workspacePath || !nav.source || !nav.frame}
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
