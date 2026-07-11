import IconSlidersHorizontalRegular from "phosphor-icons-solid/IconSlidersHorizontalRegular";
import { Button } from "@lisca/ui/components";
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
    <>
      <div
        aria-live="polite"
        class="flex cursor-default items-center gap-1.5 py-1.5 text-sm whitespace-normal"
      >
        <span class="font-medium">Expert</span>
        <span class="opacity-70">{expertMode() ? "On" : "Off"}</span>
      </div>
      <Button
        aria-label="Toggle expert mode"
        aria-pressed={expertMode()}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => setPressed(!expertMode())}
      >
        <IconSlidersHorizontalRegular />
      </Button>
    </>
  );
}
