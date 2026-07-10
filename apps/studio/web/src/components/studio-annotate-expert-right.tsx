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
        <SidebarStack>
          <p class="text-muted-foreground p-3 text-sm">
            Complete Basic info to annotate ROIs.
          </p>
        </SidebarStack>
      }
    >
      <SidebarStack>
        <StudioAnnotateNav />
        <StudioAnnotateRightContent />
      </SidebarStack>
    </Show>
  );
}
