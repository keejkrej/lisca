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
    <label class="flex h-7 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
      <span>
        Expert<span class="sr-only"> mode</span>
      </span>
      <Switch checked={expertMode()} id="studio-expert-mode" size="sm" onChange={setPressed} />
    </label>
  );
}
