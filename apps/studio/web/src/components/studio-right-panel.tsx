import type { JSX } from "solid-js";
import { Show, createMemo } from "solid-js";
import { useAtomValue } from "@effect/atom-solid";
import { RailSidebar } from "@lisca/ui/shell";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { StudioInstructionSection } from "./studio-instruction-section";

export function StudioRightPanel(props: {
  /** Content shown in default (non-expert) mode. */
  children?: JSX.Element;
  /** Lazily rendered content shown in expert mode. */
  expert?: () => JSX.Element;
  /** Step guidance shown in both expert and default modes. */
  instruction?: string | (() => string | undefined);
}) {
  const expertMode = useAtomValue(() => studioExpertModeAtom);
  const instruction = createMemo(() => {
    const value = typeof props.instruction === "function" ? props.instruction() : props.instruction;
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

  return (
    <RailSidebar>
      <Show when={instruction()}>{(text) => <StudioInstructionSection text={text()} />}</Show>
      <Show when={expertMode() && props.expert !== undefined} fallback={props.children}>
        {props.expert?.()}
      </Show>
    </RailSidebar>
  );
}
