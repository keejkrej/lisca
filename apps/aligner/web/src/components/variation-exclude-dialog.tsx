import { Button, cn, Input, Slider } from "@lisca/ui/components";
import {
  deriveVariationExcludePreview,
  formatVariationScore,
  nextVariationExcludeThreshold,
} from "@lisca/ui-headless/variation-exclude-preview";
import { DialogSurface, ModalScrim, StatTile } from "@lisca/ui/shell";
import type { VariationExcludePreview } from "../state/use-align-state";

type VariationExcludeDialogProps = {
  state: VariationExcludePreview | null;
  onApply: () => void;
  onCancel: () => void;
  onThresholdChange: (threshold: number) => void;
};

export function VariationExcludeDialog({
  state,
  onApply,
  onCancel,
  onThresholdChange,
}: VariationExcludeDialogProps) {
  const derived = deriveVariationExcludePreview(state);
  if (!derived) return null;
  const { preview, threshold, selectedCount, metrics } = derived;
  const setThreshold = (value: number) => {
    const next = nextVariationExcludeThreshold(state, value);
    if (next != null) onThresholdChange(next);
  };

  return (
    <ModalScrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <DialogSurface aria-labelledby="var-exclude-title" maxWidth="xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground text-lg" id="var-exclude-title">
            Var exclude
          </h2>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Eligible cells" value={preview.eligibleCellCount} />
            <StatTile label="Selected cells" value={selectedCount} />
            <StatTile
              label="Score range"
              value={
                <span className="text-xs">
                  {formatVariationScore(preview.scoreMin)} - {formatVariationScore(preview.scoreMax)}
                </span>
              }
            />
          </div>

          <div
            aria-label="Variation score histogram"
            className="flex h-32 items-end gap-1 rounded-md border border-border bg-background/50 px-3 py-2"
          >
            {preview.histogramBins.map((bin) => {
              const active = bin.end <= threshold;
              return (
                <div
                  key={`${bin.start}:${bin.end}`}
                  className={cn(
                    "min-w-0 flex-1 rounded-t-sm",
                    active ? "bg-primary" : "bg-muted-foreground/28",
                  )}
                  style={{
                    height: `${Math.max(4, (bin.count / metrics.maxBinCount) * 100)}%`,
                  }}
                  title={`${formatVariationScore(bin.start)} - ${formatVariationScore(bin.end)}: ${bin.count}`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-end gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  className="font-medium text-foreground text-sm"
                  htmlFor="variation-threshold"
                >
                  Threshold
                </label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatVariationScore(threshold)}
                </span>
              </div>
              <Slider
                max={metrics.max}
                min={metrics.min}
                step={metrics.step}
                value={threshold}
                onValueChange={setThreshold}
              />
            </div>
            <Input
              nativeInput
              aria-label="Threshold value"
              id="variation-threshold"
              max={metrics.max}
              min={metrics.min}
              step={metrics.step}
              type="number"
              value={Number.isFinite(threshold) ? threshold : metrics.min}
              onChange={(event) => setThreshold(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onApply}>
            Apply
          </Button>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
