import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAssaySave } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";

export function StudioMetadataActions(props: { onNext: () => void }) {
  const save = useStudioAssaySave();
  const saveLabel = () => (save.saving() ? "Saving…" : save.dirty() ? "Save" : "Saved");

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          class="w-full justify-center"
          disabled={save.saving() || !save.dirty()}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void save.saveAssay(false)}
        >
          {saveLabel()}
        </Button>
        <Show when={save.saveError()}>
          {(message) => (
            <p class="text-destructive text-xs" role="alert">
              {message()}
            </p>
          )}
        </Show>
        <Button class="w-full justify-center" size="sm" type="button" onClick={props.onNext}>
          Continue
        </Button>
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
