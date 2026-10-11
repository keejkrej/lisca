import { Button } from "@lisca/ui/primitives";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";

import { useAnnotateDock } from "../state/annotate-page-selectors";

export function AnnotatorSaveSection() {
  const dock = useAnnotateDock();

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          class="w-full justify-center"
          disabled={!dock.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void dock.handleSave()}
        >
          Save
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}
