import type { JSX } from "solid-js";
import { Show, createMemo } from "solid-js";
import { useAtomValue } from "@effect-atom/atom-solid";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import { StudioExpertToggle } from "./studio-expert-toggle";
import { StudioInstructionSection } from "./studio-instruction-section";

export function StudioRightPanel(props: {
  /** Content shown in default (non-expert) mode. */
  children?: JSX.Element;
  /** Lazily rendered content shown in expert mode. */
  expert?: () => JSX.Element;
  /** Step guidance shown in both expert and default modes. */
  instruction?: string | (() => string | undefined);
}) {
  const expertMode = useAtomValue(studioExpertModeAtom);
  const instruction = createMemo(() => {
    const value =
      typeof props.instruction === "function" ? props.instruction() : props.instruction;
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

  return (
    <div class="flex h-full min-h-0 flex-col items-stretch gap-2.5 p-2.5">
      <div class="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto">
        <div class="flex w-full shrink-0 flex-col items-stretch gap-2">
          <Show when={instruction()}>
            {(text) => <StudioInstructionSection text={text()} />}
          </Show>
          <Show when={expertMode()} fallback={props.children}>
            {props.expert?.()}
          </Show>
        </div>
      </div>
      <div class="flex shrink-0 flex-row items-center justify-center gap-2">
        <StudioExpertToggle />
      </div>
    </div>
  );
}
