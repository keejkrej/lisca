import { Button, cn, Input, ModalScrim, Slider, surfaceDialogClass } from "@lisca/ui";
import { useMemo } from "react";

import type { VariationExcludePreview } from "../state/use-align-state";

type VariationExcludeDialogProps = {
  state: VariationExcludePreview | null;
  onApply: () => void;
  onCancel: () => void;
  onThresholdChange: (threshold: number) => void;
};

function formatScore(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

function clampThreshold(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function VariationExcludeDialog({
  state,
  onApply,
  onCancel,
  onThresholdChange,
}: VariationExcludeDialogProps) {
  const preview = state?.preview ?? null;
  const threshold = state?.threshold ?? 0;
  const selectedCount = useMemo(
    () => preview?.cellScores.filter((cell) => cell.score <= threshold).length ?? 0,
    [preview, threshold],
  );

  if (!preview) return null;

  const min = preview.scoreMin;
  const max = preview.scoreMax > preview.scoreMin ? preview.scoreMax : preview.scoreMin + 1;
  const step = Math.max((max - min) / 500, 0.001);
  const maxBinCount = Math.max(1, ...preview.histogramBins.map((bin) => bin.count));

  const setThreshold = (value: number) => {
    onThresholdChange(clampThreshold(value, min, max));
  };

  return (
    <ModalScrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        aria-labelledby="variation-exclude-title"
        aria-modal="true"
        className={cn("flex w-full max-w-xl flex-col", surfaceDialogClass)}
        role="dialog"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground text-lg" id="variation-exclude-title">
            Variation exclude
          </h2>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
              <div className="text-muted-foreground text-xs">Eligible cells</div>
              <div className="mt-1 font-medium tabular-nums">{preview.eligibleCellCount}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
              <div className="text-muted-foreground text-xs">Selected cells</div>
              <div className="mt-1 font-medium tabular-nums">{selectedCount}</div>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
              <div className="text-muted-foreground text-xs">Score range</div>
              <div className="mt-1 font-medium text-xs tabular-nums">
                {formatScore(preview.scoreMin)} - {formatScore(preview.scoreMax)}
              </div>
            </div>
          </div>

          <div
            aria-label="Variation score histogram"
            className="flex h-32 items-end gap-1 rounded-md border border-border bg-background/50 px-3 py-2"
          >
            {preview.histogramBins.map((bin, index) => {
              const active = bin.end <= threshold;
              return (
                <div
                  key={`${bin.start}:${bin.end}:${index}`}
                  className={cn(
                    "min-w-0 flex-1 rounded-t-sm",
                    active ? "bg-primary" : "bg-muted-foreground/28",
                  )}
                  style={{ height: `${Math.max(4, (bin.count / maxBinCount) * 100)}%` }}
                  title={`${formatScore(bin.start)} - ${formatScore(bin.end)}: ${bin.count}`}
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
                  {formatScore(threshold)}
                </span>
              </div>
              <Slider
                max={max}
                min={min}
                step={step}
                value={threshold}
                onValueChange={setThreshold}
              />
            </div>
            <Input
              nativeInput
              aria-label="Threshold value"
              id="variation-threshold"
              max={max}
              min={min}
              step={step}
              type="number"
              value={Number.isFinite(threshold) ? threshold : min}
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
      </div>
    </ModalScrim>
  );
}
