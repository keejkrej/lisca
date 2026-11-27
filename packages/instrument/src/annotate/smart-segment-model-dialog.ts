import type { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { ModalScrim } from "@lisca/ui/patterns";
import { Spinner } from "@lisca/ui/spinner";

export type SmartSegmentModelDialogState = {
  readonly open: boolean;
  readonly requiresDownload: boolean;
  readonly progress: number;
  readonly message: string;
  readonly file?: string | undefined;
};

export type SmartSegmentModelDialogOptions<M> = {
  readonly key?: string | undefined;
  readonly state: SmartSegmentModelDialogState;
  readonly busy: boolean;
  readonly onConfirm: M;
  readonly onCancel: M;
};

export type SmartSegmentModelDialogProps<M = never> = SmartSegmentModelDialogOptions<M>;

export function SmartSegmentModelDialog<M>(
  h: Html.H<M>,
  options: SmartSegmentModelDialogOptions<M>,
) {
  if (!options.state.open) {
    return undefined;
  }

  const loading = options.busy || options.state.progress > 0;
  const consent = options.state.requiresDownload && !loading;
  const progress = Math.max(0, Math.min(100, options.state.progress));

  return ModalScrim(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    zIndex: "z-40",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabel: "Smart segment model download",
    dismissible: false,
    children: [
      h.div.class("font-medium text-foreground").children("Smart model"),
      h.p
        .class("mt-2 text-muted-foreground text-sm")
        .children(
          consent
            ? "Smart needs a one-time download of the SlimSAM model (~40 MB) before your first click can run."
            : loading
              ? options.state.requiresDownload
                ? "Downloading the SlimSAM model to your browser for local segmentation."
                : "Loading the cached SlimSAM model from your browser."
              : "Preparing smart…",
        ),
      ...(loading
        ? [
            h.div
              .class("mt-4 flex items-center gap-3")
              .children(
                Spinner(h, { class: "size-4" }),
                h.div
                  .class("min-w-0 truncate text-sm text-muted-foreground")
                  .children(options.state.message),
              ),
            h.div
              .class("mt-4 h-2 overflow-hidden rounded-none bg-muted")
              .children(
                h.div
                  .class("h-full bg-primary transition-[width]")
                  .style({ width: `${progress}%` }),
              ),
            h.div
              .class("mt-2 text-muted-foreground text-xs tabular-nums")
              .children(`${Math.round(options.state.progress)}%`),
          ]
        : []),
      h.div.class("mt-4 flex gap-2").children(
        Button(h, {
          class: "flex-1 justify-center",
          disabled: options.busy,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: options.onCancel,
        }).children("Cancel"),
        consent
          ? Button(h, {
              class: "flex-1 justify-center",
              disabled: options.busy,
              size: "sm",
              type: "button",
              onPress: options.onConfirm,
            }).children("Download model")
          : undefined,
      ),
    ],
  });
}
