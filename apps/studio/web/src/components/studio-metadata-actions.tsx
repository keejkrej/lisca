import { Button } from "@lisca/ui/components";
import { CanvasToastStack, useCanvasTransientStatus } from "@lisca/ui/features";
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
  const savedNotice = useCanvasTransientStatus(save.saveNotice);
  const toast = () => {
    const error = save.saveError();
    if (error) return { text: error, tone: "error" as const };
    const saved = savedNotice();
    if (saved) return { text: saved, tone: "success" as const };
    return null;
  };
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
        <Show when={toast()}>{(message) => <CanvasToastStack messages={[message()]} />}</Show>
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
