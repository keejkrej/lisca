import { Switch } from "@lisca/ui/components";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-solid";

import { setStudioExpertMode, studioExpertModeAtom } from "../atoms/studio-expert-atoms";

export function StudioExpertToggle() {
  const expertMode = useAtomValue(studioExpertModeAtom);
  const setExpertMode = useAtomSet(studioExpertModeAtom);

  const setPressed = (pressed: boolean) => {
    setExpertMode(pressed);
    setStudioExpertMode(pressed);
  };

  return (
    <label class="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
      <span>Expert</span>
      <Switch
        aria-label="Expert mode"
        checked={expertMode()}
        id="studio-expert-mode"
        size="sm"
        onChange={setPressed}
      />
    </label>
  );
}
