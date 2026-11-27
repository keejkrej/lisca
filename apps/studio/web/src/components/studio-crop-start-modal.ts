import type { Html } from "@effect/ui/html";
import { ModalScrim } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";

import type { CropStartConfirmState } from "../state/use-studio-align-state";

type PositionScanLabels =
  | {
      readonly positions: readonly number[];
      readonly positionLabels?: readonly string[] | undefined;
    }
  | null
  | undefined;

function positionLabel(pos: number, scan: PositionScanLabels): string {
  const index = scan?.positions.indexOf(pos) ?? -1;
  const label = index >= 0 ? scan?.positionLabels?.[index] : undefined;
  return `Pos${label ?? pos}`;
}

function formatPositions(positions: number[], scan: PositionScanLabels): string {
  const shown = positions.slice(0, 6).map((pos) => positionLabel(pos, scan));
  const more = positions.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
}

function formatResolvedRange(positions: number[], scan: PositionScanLabels): string {
  if (positions.length === 0) return "0 positions";
  const first = positionLabel(positions[0]!, scan);
  const last = positionLabel(positions[positions.length - 1]!, scan);
  return `${positions.length} positions: ${first} to ${last}`;
}

export type StudioCropStartModalOptions<M> = {
  readonly confirm: CropStartConfirmState | null;
  readonly scan: PositionScanLabels;
  readonly onCancel: M;
  readonly onStart: M;
  readonly onGoToUnaligned: M;
};

export function StudioCropStartModal<M>(h: Html.H<M>, options: StudioCropStartModalOptions<M>) {
  const confirm = options.confirm;
  if (!confirm) return undefined;

  const allAligned = confirm.unaligned.length === 0;

  return ModalScrim(h, {
    key: "studio-crop-start-modal",
    zIndex: "z-50",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabelledby: "studio-crop-start-title",
    dismissible: false,
    children: h.div.class("space-y-4").children(
      h.div.class("space-y-1").children(
        h.h2
          .attr("id", "studio-crop-start-title")
          .class("font-medium text-foreground")
          .children(allAligned ? "All positions aligned" : "Not all positions aligned"),
        h.p
          .class("text-muted-foreground text-sm")
          .children(
            allAligned
              ? `${formatResolvedRange(confirm.positions, options.scan)} have saved alignment output. Crop ROI images from the aligned grid now?`
              : `${confirm.positions.length - confirm.unaligned.length} of ${confirm.positions.length} positions aligned. Save an alignment for ${formatPositions(confirm.unaligned, options.scan)} before cropping.`,
          ),
      ),
      h.div.class("flex justify-end gap-2").children(
        Button(h, {
          type: "button",
          variant: "outline",
          onPress: options.onCancel,
        }).children("Cancel"),
        allAligned
          ? Button(h, {
              type: "button",
              onPress: options.onStart,
            }).children("Start")
          : Button(h, {
              type: "button",
              onPress: options.onGoToUnaligned,
            }).children("Go to unaligned"),
      ),
    ),
  });
}
