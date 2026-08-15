import { SidebarStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import { StudioAnnotateNav } from "./studio-annotate-nav";
import { StudioAnnotateRightContent } from "./studio-annotate-right";

export function StudioAnnotateExpertRight() {
  const { state } = useStudioAnnotatePage();

  return (
    <Show
      when={!state.workspaceMissing}
      fallback={
        <SidebarStack class="p-0">
          <p class="text-muted-foreground text-sm">Choose a workspace in Basic info first.</p>
        </SidebarStack>
      }
    >
      <SidebarStack class="p-0">
        <StudioAnnotateNav />
        <StudioAnnotateRightContent />
      </SidebarStack>
    </Show>
  );
}
