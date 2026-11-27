import type { Html } from "@effect/ui/html";
import type { CropRoiProgress } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { ModalScrim } from "@lisca/ui/patterns";
import { Spinner } from "@lisca/ui/spinner";
import { useCropProgressModal } from "@lisca/ui-headless/crop-progress-modal";

export type CropProgressModalOptions<M> = {
  readonly key?: string | undefined;
  readonly progress: CropRoiProgress | null | undefined;
  readonly onCancel: M;
};

export type CropProgressModalProps<M = never> = CropProgressModalOptions<M>;

/** ROI crop progress overlay. Renders nothing until a task is active. */
export function CropProgressModal<M>(h: Html.H<M>, options: CropProgressModalOptions<M>) {
  const active = useCropProgressModal(options.progress);
  if (!active) return undefined;

  return ModalScrim(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    zIndex: "z-40",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabel: "Cropping ROI output",
    dismissible: false,
    children: [
      h.div
        .class("flex items-center gap-3")
        .children(
          Spinner(h, { class: "size-4" }),
          h.div
            .class("min-w-0")
            .children(
              h.div.class("font-medium text-foreground").children("Cropping ROI output"),
              h.div.class("truncate text-muted-foreground text-sm").children(active.message),
            ),
        ),
      h.div
        .class("mt-4 h-2 overflow-hidden rounded-none bg-muted")
        .children(h.div.class("h-full bg-primary").style({ width: `${active.pct}%` })),
      h.div
        .class("mt-2 text-muted-foreground text-xs tabular-nums")
        .children(`${active.done} / ${active.total}`),
      Button(h, {
        class: "mt-4 w-full justify-center",
        type: "button",
        variant: "outline",
        onPress: options.onCancel,
      }).children("Cancel"),
    ],
  });
}
