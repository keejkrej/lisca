import { AlignSelectionCounts } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { SidebarSection, SidebarStack } from "@lisca/ui/shell";
import {
  collectAlignGridEdgeCells,
  enumerateVisibleAlignGridCells,
  mergeExcludedAlignGridCells,
} from "@lisca/utils";
import { Show } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioAlignExpertRight() {
  const { state, smartExclude } = useStudioAlignPage();
  const disabled = () => state.cropping || !state.frame;

  const visibleCells = () =>
    state.frame
      ? enumerateVisibleAlignGridCells(state.frame, state.grid).map(({ i, j }) => ({ i, j }))
      : [];
  const hasVisibleCells = () => visibleCells().length > 0;
  const hasExcludedCells = () => state.currentExcludedCells.length > 0;

  return (
    <SidebarStack>
      <Show
        when={state.frame}
        fallback={
          <SidebarSection title="Selection">
            <p class="text-muted-foreground text-sm">Load a frame to see selection controls.</p>
          </SidebarSection>
        }
      >
        <SidebarSection title="Selection">
          <AlignSelectionCounts
            excluded={state.visibleCounts.excluded}
            included={state.visibleCounts.included}
          />
          <div class="grid grid-cols-2 gap-2">
            <Button
              class="w-full justify-center text-xs"
              disabled={disabled() || !hasExcludedCells()}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => state.setExcludedCellsForCurrentPosition([])}
            >
              Reset
            </Button>
            <Button
              class="w-full justify-center text-xs"
              disabled={disabled() || !hasVisibleCells()}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => state.setExcludedCellsForCurrentPosition(visibleCells())}
            >
              Exclude all
            </Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <Button
              class="w-full justify-center text-xs"
              disabled={disabled() || !hasVisibleCells()}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                if (!state.frame) return;
                state.setExcludedCellsForCurrentPosition(
                  mergeExcludedAlignGridCells(
                    state.currentExcludedCells,
                    collectAlignGridEdgeCells(state.frame, state.grid),
                  ),
                );
              }}
            >
              Edge exclude
            </Button>
            <Button
              class="w-full justify-center text-xs"
              disabled={disabled() || !hasVisibleCells() || smartExclude.active()}
              loading={smartExclude.active()}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void smartExclude.request()}
            >
              Smart exclude
            </Button>
          </div>
        </SidebarSection>
      </Show>
    </SidebarStack>
  );
}
