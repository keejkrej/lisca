import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";

import {
  CommandShortcutHint,
  commandShortcutKeys,
  useStudioCommandShortcut,
} from "../navigation/use-studio-command-shortcut";

export function StudioAssayActions(props: {
  openingAssay: boolean;
  assayPickerOpen: boolean;
  onNewAssay: () => void;
  onOpenAssay: () => void;
}) {
  useStudioCommandShortcut(
    "open",
    () => !props.openingAssay && !props.assayPickerOpen,
    () => props.onOpenAssay(),
  );
  useStudioCommandShortcut(
    "new",
    () => !props.openingAssay,
    () => props.onNewAssay(),
  );

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          aria-keyshortcuts={commandShortcutKeys("open")}
          class="relative w-full justify-center"
          disabled={props.openingAssay || props.assayPickerOpen}
          size="sm"
          type="button"
          variant="outline"
          onClick={props.onOpenAssay}
        >
          Open
          <CommandShortcutHint command="open" />
        </Button>
        <Button
          aria-keyshortcuts={commandShortcutKeys("new")}
          class="relative w-full justify-center"
          disabled={props.openingAssay}
          size="sm"
          type="button"
          onClick={props.onNewAssay}
        >
          New
          <CommandShortcutHint command="new" />
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}
