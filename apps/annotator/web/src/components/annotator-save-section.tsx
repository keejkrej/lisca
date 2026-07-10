import { Button } from "@lisca/ui/components";
import { DockSection, ReadonlyPathField } from "@lisca/ui/shell";
import { For, Show } from "solid-js";

import { annotationOutputPaths } from "../utils/annotation-output";
import { useAnnotateDock } from "../state/annotate-page-selectors";

export function AnnotatorSaveSection() {
  const dock = useAnnotateDock();
  const paths = annotationOutputPaths(dock.request, dock.mode);

  return (
    <DockSection title="Save">
      <div class="flex w-full flex-col gap-2">
        <Show
          when={paths.length > 1}
          fallback={
            <For each={paths}>
              {(path) => (
                <ReadonlyPathField aria-label={`Output path ${path}`} value={path} />
              )}
            </For>
          }
        >
          <div class="grid w-full grid-cols-2 gap-2">
            <For each={paths}>
              {(path) => (
                <div class="min-w-0">
                  <ReadonlyPathField aria-label={`Output path ${path}`} value={path} />
                </div>
              )}
            </For>
          </div>
        </Show>
        <Show
          when={paths.length > 1}
          fallback={
            <Button
              class="w-full justify-center"
              disabled={!dock.canSave}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void dock.handleSave()}
            >
              {dock.saving ? "Saving…" : "Save"}
            </Button>
          }
        >
          <div class="grid w-full grid-cols-2 gap-2">
            <div class="col-span-2 min-w-0">
              <Button
                class="w-full justify-center"
                disabled={!dock.canSave}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => void dock.handleSave()}
              >
                {dock.saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </DockSection>
  );
}