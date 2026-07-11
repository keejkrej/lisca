import { Toggle } from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";

import { setStudioExpertMode, studioExpertModeAtom } from "../atoms/studio-expert-atoms";

export function StudioExpertToggle() {
  const expertMode = useAtomValue(studioExpertModeAtom);
  const setExpertMode = useAtomSet(studioExpertModeAtom);

  const onPress = (pressed: boolean) => {
    setExpertMode(pressed);
    setStudioExpertMode(pressed);
  };

  return (
    <div class="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
      <div class="flex items-center gap-1.5 text-sm">
        <span class="font-medium">Expert</span>
      </div>
      <Toggle
        aria-label="Expert mode"
        pressed={expertMode()}
        size="sm"
        onChange={onPress}
      >
        <span class="text-xs">{expertMode() ? "ON" : "OFF"}</span>
      </Toggle>
    </div>
  );
}
