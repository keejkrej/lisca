import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";

import { useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();

  // Aligner is light: save bbox/align only. ROI crop runs in Studio, lisca-crop, or pyama-v2.
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
          Save boxes
        </Button>
        <p class="text-xs text-muted-foreground">
          ROI crop is not run here. Use Studio,{" "}
          <code class="text-[0.7rem]">lisca-crop</code>, or pyama-v2.
        </p>
      </div>
    </DockSection>
  );
}
