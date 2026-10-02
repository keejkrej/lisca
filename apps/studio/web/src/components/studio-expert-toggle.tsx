import { Toggle } from "@lisca/ui/components";
import { AlignStateToggleIndicator } from "@lisca/ui/features";
import { useAtomSet, useAtomValue } from "@effect/atom-solid";

import { setStudioExpertMode, studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import {
  CommandShortcutHint,
  commandShortcutKeys,
} from "../navigation/use-studio-command-shortcut";

export function StudioExpertToggle() {
  const expertMode = useAtomValue(() => studioExpertModeAtom);
  const setExpertMode = useAtomSet(() => studioExpertModeAtom);

  const setPressed = (pressed: boolean) => {
    setExpertMode(pressed);
    setStudioExpertMode(pressed);
  };

  return (
    <Toggle
      aria-keyshortcuts={commandShortcutKeys("expert")}
      aria-label="Expert mode"
      aria-pressed={expertMode()}
      class="h-7 gap-2 px-2.5 text-xs"
      data-instrument-state-toggle=""
      pressed={expertMode()}
      size="sm"
      variant="outline"
      onChange={setPressed}
    >
      <AlignStateToggleIndicator pressed={expertMode()} />
      <span>Expert</span>
      <CommandShortcutHint command="expert" placement="inline" />
    </Toggle>
  );
}
