import { Button } from "@lisca/ui/primitives";
import { PanelSection, RailActionPair, RailControlStack } from "@lisca/ui/patterns";
import { createEffect, createMemo, onCleanup } from "solid-js";

import { useAlignNav } from "../state/align-page-selectors";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function AlignSaveSection() {
  const nav = useAlignNav();
  const canSave = createMemo(() => Boolean(nav.workspacePath && nav.frame && !nav.saving));
  const saveStateLabel = createMemo(() => {
    if (!nav.workspacePath || !nav.frame) return null;
    if (nav.positionSaveState === "changed") return "Unsaved changes";
    if (nav.positionSaveState === "saved") return "Saved";
    return "Not saved";
  });

  createEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.altKey) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (!event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && canSave()) void nav.saveCurrent();
        return;
      }
      if (isEditableTarget(event.target) || event.shiftKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && nav.canGoBack) nav.goBack();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && nav.canGoNext) nav.goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown, true));
  });

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        {saveStateLabel() ? (
          <div class="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Position status</span>
            <span
              classList={{
                "text-foreground font-medium": nav.positionSaveState === "changed",
              }}
            >
              {saveStateLabel()}
            </span>
          </div>
        ) : null}
        <Button
          aria-keyshortcuts="Control+S Meta+S"
          class="w-full justify-center"
          disabled={!canSave()}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void nav.saveCurrent()}
        >
          Save
        </Button>
        <RailActionPair label="Position navigation">
          <Button
            aria-keyshortcuts="Control+ArrowLeft Meta+ArrowLeft"
            class="w-full justify-center"
            data-rail-nav
            disabled={!nav.canGoBack}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => nav.goBack()}
          >
            Back
          </Button>
          <Button
            aria-keyshortcuts="Control+ArrowRight Meta+ArrowRight"
            class="w-full justify-center"
            data-rail-nav
            disabled={!nav.canGoNext}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => nav.goNext()}
          >
            Next
          </Button>
        </RailActionPair>
      </RailControlStack>
    </PanelSection>
  );
}
