import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";

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
          {dock.saving ? "Saving…" : "Save"}
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}
