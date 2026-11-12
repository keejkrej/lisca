import { Button } from "@lisca/ui/primitives";
import { PanelSection, RailActionPair, RailControlStack } from "@lisca/ui/patterns";
import { createEffect, onCleanup } from "solid-js";

import { useAnnotateDock } from "../state/annotate-page-selectors";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function AnnotatorSaveSection() {
  const dock = useAnnotateDock();

  createEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.altKey) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (!event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && dock.canSave && !dock.saving) void dock.handleSave();
        return;
      }
      if (isEditableTarget(event.target) || event.shiftKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && dock.canGoBack) dock.goBack();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && dock.canGoNext) dock.goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown, true));
  });

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          aria-keyshortcuts="Control+S Meta+S"
          class="w-full justify-center"
          disabled={!dock.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void dock.handleSave()}
        >
          Save
        </Button>
        <RailActionPair label="ROI navigation">
          <Button
            aria-keyshortcuts="Control+ArrowLeft Meta+ArrowLeft"
            class="w-full justify-center"
            data-rail-nav
            disabled={!dock.canGoBack}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => dock.goBack()}
          >
            Back
          </Button>
          <Button
            aria-keyshortcuts="Control+ArrowRight Meta+ArrowRight"
            class="w-full justify-center"
            data-rail-nav
            disabled={!dock.canGoNext}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => dock.goNext()}
          >
            Next
          </Button>
        </RailActionPair>
      </RailControlStack>
    </PanelSection>
  );
}
