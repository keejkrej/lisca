import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { Show } from "solid-js";

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
  onOpenGuide?: () => void;
  onChangeInterests?: () => void;
  onOpenFeedback?: () => void;
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
    <>
      <Show when={props.onOpenGuide || props.onChangeInterests || props.onOpenFeedback}>
        <PanelSection appearance="rail" title="Research">
          <RailControlStack>
            <Show when={props.onOpenGuide}>
              <Button
                class="w-full justify-center"
                size="sm"
                type="button"
                variant="outline"
                onClick={props.onOpenGuide}
              >
                Research guide
              </Button>
            </Show>
            <Show when={props.onChangeInterests}>
              <Button
                class="w-full justify-center"
                size="sm"
                type="button"
                variant="outline"
                onClick={props.onChangeInterests}
              >
                Research interests
              </Button>
            </Show>
            <Show when={props.onOpenFeedback}>
              <Button
                class="w-full justify-center"
                size="sm"
                type="button"
                variant="outline"
                onClick={props.onOpenFeedback}
              >
                Help us improve
              </Button>
            </Show>
          </RailControlStack>
        </PanelSection>
      </Show>
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
    </>
  );
}
