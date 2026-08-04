import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";

import { useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();

  return (
    <DockSection title="Save">
      <div class="flex w-full flex-col gap-2">
        <div class="grid w-full grid-cols-2 gap-2">
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
        </div>
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
    </DockSection>
  );
}
