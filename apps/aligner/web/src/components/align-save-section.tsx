import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";

import { useAlignNav } from "../state/align-page-selectors";

export function AlignSaveSection() {
  const nav = useAlignNav();

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
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
      </RailControlStack>
    </PanelSection>
  );
}
