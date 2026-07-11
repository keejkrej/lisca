import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { useAtomValue } from "@effect-atom/atom-solid";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { StudioExpertToggle } from "./studio-expert-toggle";

export function StudioRightPanel(props: {
  /** Content shown in default (non-expert) mode. */
  children?: JSX.Element;
  /** Lazily rendered content shown in expert mode. */
  expert?: () => JSX.Element;
}) {
  const expertMode = useAtomValue(studioExpertModeAtom);

  return (
    <div class="flex h-full min-h-0 flex-col">
      <StudioExpertToggle />
      <div class="min-h-0 flex-1 overflow-y-auto">
        <Show when={expertMode()} fallback={props.children}>
          {props.expert?.()}
        </Show>
      </div>
    </div>
  );
}
