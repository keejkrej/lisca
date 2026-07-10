import { For, Show } from "solid-js";
import { Button, cn, Input, Slider } from "../../components/ui";
import {
  deriveVariationExcludePreview,
  formatVariationScore,
  nextVariationExcludeThreshold,
} from "@lisca/ui-headless/variation-exclude-preview";
import type { AutoExcludePreviewResponse } from "@lisca/contracts";
import { DialogSurface, ModalScrim, StatTile } from "../../shell";

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
            <DialogSurface aria-labelledby="var-exclude-title" maxWidth="xl">
              <div class="border-b border-border px-5 py-4">
                <h2 class="font-semibold text-foreground text-lg" id="var-exclude-title">
                  Var exclude
                </h2>
              </div>

              <div class="flex flex-col gap-4 px-5 py-4">
                <div class="grid grid-cols-3 gap-2">
                  <StatTile label="Eligible cells" value={preview().eligibleCellCount} />
                  <StatTile label="Selected cells" value={selectedCount()} />
                  <StatTile
                    label="Score range"
                    value={
                      <span class="text-xs">
                        {formatVariationScore(preview().scoreMin)} -{" "}
                        {formatVariationScore(preview().scoreMax)}
                      </span>
                    }
                  />
                </div>

                <div
                  aria-label="Variation score histogram"
                  class="flex h-32 items-end gap-1 rounded-md border border-border bg-background/50 px-3 py-2"
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

                <div class="grid grid-cols-[minmax(0,1fr)_7rem] items-end gap-3">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between gap-3">
                      <label
                        class="font-medium text-foreground text-sm"
                        for="variation-threshold"
                      >
                        Threshold
                      </label>
                      <span class="text-muted-foreground text-xs tabular-nums">
                        {formatVariationScore(threshold())}
                      </span>
                    </div>
                    <Slider
                      max={metrics().max}
                      min={metrics().min}
                      step={metrics().step}
                      value={threshold()}
                      onValueChange={setThreshold}
                    />
                  </div>
                  <Input
                    nativeInput
                    aria-label="Threshold value"
                    id="variation-threshold"
                    max={metrics().max}
                    min={metrics().min}
                    step={metrics().step}
                    type="number"
                    value={Number.isFinite(threshold()) ? threshold() : metrics().min}
                    onInput={(event) => setThreshold(Number(event.currentTarget.value))}
                  />
                </div>
              </div>

              <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
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