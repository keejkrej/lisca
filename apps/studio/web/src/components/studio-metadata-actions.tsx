import { Button } from "@lisca/ui/components";
import { CanvasToastStack } from "@lisca/ui/features";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import {
  CommandShortcutHint,
  commandShortcutKeys,
  useStudioCommandShortcut,
} from "../navigation/use-studio-command-shortcut";
import { useStudioAssaySave } from "../state/use-studio-assay-save";
import { AssayOverwriteConfirmModal } from "./assay-overwrite-confirm-modal";

export function StudioMetadataActions() {
  const save = useStudioAssaySave();
  useStudioCommandShortcut(
    "save",
    () => !save.saving() && !save.overwriteOpen(),
    () => void save.saveAssay(false),
  );

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          aria-keyshortcuts={commandShortcutKeys("save")}
          class="relative w-full justify-center"
          size="sm"
          type="button"
          onClick={() => void save.saveAssay(false)}
        >
          Save
          <CommandShortcutHint command="save" />
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
