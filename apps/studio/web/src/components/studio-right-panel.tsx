import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { useAtomValue } from "@effect/atom-solid";
import { RailSidebar } from "@lisca/ui/patterns";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";

export function StudioRightPanel(props: {
  /** Content shown in default (non-expert) mode. */
  children?: JSX.Element;
  /** Lazily rendered content shown in expert mode. */
  expert?: () => JSX.Element;
}) {
  const expertMode = useAtomValue(() => studioExpertModeAtom);

  return (
    <RailSidebar>
      <Show when={expertMode() && props.expert !== undefined} fallback={props.children}>
        {props.expert?.()}
      </Show>
    </RailSidebar>
  );
}
