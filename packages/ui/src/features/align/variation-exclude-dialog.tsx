import { For, Show } from "solid-js";
import { Button, cn, Slider } from "../../components/ui";
import {
  deriveVariationExcludePreview,
  formatVariationScore,
  nextVariationExcludeThreshold,
} from "@lisca/ui-headless/variation-exclude-preview";
import type { AutoExcludePreviewResponse } from "@lisca/contracts";
import { DialogSurface, ModalScrim } from "../../shell";

export type VariationExcludePreviewState = {
  preview: AutoExcludePreviewResponse;
  threshold: number;
} | null;

export function VariationExcludeDialog(props: {
  state: VariationExcludePreviewState;
  onApply: () => void;
  onCancel: () => void;
  onThresholdChange: (threshold: number) => void;
}) {
  const derived = () =>
    deriveVariationExcludePreview(
      props.state ? { preview: props.state.preview, threshold: props.state.threshold } : null,
    );

  const setThreshold = (value: number) => {
    const next = nextVariationExcludeThreshold(
      props.state ? { preview: props.state.preview, threshold: props.state.threshold } : null,
      value,
    );
    if (next != null) props.onThresholdChange(next);
  };

  return (
    <Show when={derived()}>
      {(derivedState) => {
        const preview = () => derivedState().preview;
        const threshold = () => derivedState().threshold;
        const selectedCount = () => derivedState().selectedCount;
        const metrics = () => derivedState().metrics;

        return (
          <ModalScrim
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) props.onCancel();
            }}
          >
            <DialogSurface aria-labelledby="var-exclude-title" maxWidth="lg">
              <div class="border-b border-border px-5 py-3">
                <h2 class="font-semibold text-foreground text-base" id="var-exclude-title">
                  Var exclude
                </h2>
              </div>

              <div class="flex flex-col gap-3 px-5 py-4">
                <div
                  aria-label="Variation score histogram"
                  class="flex h-28 items-end gap-0.5 rounded-md border border-border bg-background/50 px-2 py-2"
                >
                  <For each={preview().histogramBins}>
                    {(bin) => {
                      const active = () => bin.end <= threshold();
                      return (
                        <div
                          class={cn(
                            "min-w-0 flex-1 rounded-t-sm",
                            active() ? "bg-primary" : "bg-muted-foreground/28",
                          )}
                          style={{
                            height: `${Math.max(4, (bin.count / metrics().maxBinCount) * 100)}%`,
                          }}
                          title={`${formatVariationScore(bin.start)} - ${formatVariationScore(bin.end)}: ${bin.count}`}
                        />
                      );
                    }}
                  </For>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <label class="font-medium text-foreground text-sm" for="variation-threshold">
                      Threshold
                    </label>
                    <span class="text-muted-foreground text-sm tabular-nums">
                      {formatVariationScore(threshold())}
                    </span>
                  </div>
                  <Slider
                    id="variation-threshold"
                    max={metrics().max}
                    min={metrics().min}
                    step={metrics().step}
                    value={threshold()}
                    onValueChange={setThreshold}
                  />
                  <p class="text-muted-foreground text-sm">
                    Exclude {selectedCount()} of {preview().eligibleCellCount} sites
                  </p>
                </div>
              </div>

              <div class="flex justify-end gap-2 border-t border-border px-5 py-3">
                <Button type="button" variant="outline" onClick={props.onCancel}>
                  Cancel
                </Button>
                <Button type="button" onClick={props.onApply}>
                  Apply
                </Button>
              </div>
            </DialogSurface>
          </ModalScrim>
        );
      }}
    </Show>
  );
}