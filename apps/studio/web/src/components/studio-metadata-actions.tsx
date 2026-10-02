import { Button } from "@lisca/ui/components";
import { CanvasToastStack } from "@lisca/ui/features";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAssaySave } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";

export function StudioMetadataActions() {
  const save = useStudioAssaySave();

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          class="w-full justify-center"
          size="sm"
          type="button"
          onClick={() => void save.saveAssay(false)}
        >
          Save
        </Button>
        <Show when={save.saveError()}>
          {(message) => <CanvasToastStack messages={[{ text: message(), tone: "error" }]} />}
        </Show>
      </RailControlStack>
      <AssayOverwriteConfirmModal
        open={save.overwriteOpen()}
        saveTo={save.workspacePath()}
        onCancel={() => save.setOverwriteOpen(false)}
        onOverwrite={() => {
          save.setOverwriteOpen(false);
          void save.saveAssay(true);
        }}
      />
    </PanelSection>
  );
}
