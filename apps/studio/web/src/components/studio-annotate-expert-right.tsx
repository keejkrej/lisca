import { Show } from "solid-js";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { StudioAnnotateNav } from "./studio-annotate-nav";
import { StudioAnnotateRightContent } from "./studio-annotate-right";
import { StudioAnnotateControls } from "./studio-annotate-dock";

export function StudioAnnotateExpertRight() {
  const { state } = useStudioAnnotatePage();

  return (
    <Show
      when={!state.workspaceMissing}
      fallback={
        <p class="text-[13px] leading-[18px] text-muted-foreground">
          Choose a workspace on the Info step first.
        </p>
      }
    >
      <>
        <StudioAnnotateNav />
        <StudioAnnotateRightContent />
        <StudioAnnotateControls showShuffle />
      </>
    </Show>
  );
}
