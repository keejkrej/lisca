import { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";

import { Dialog, DIALOG_OVERLAY_CLASS } from "../../components/ui/dialog";
import { cn } from "../../lib/utils";
import { dialogSurfaceClasses, type DialogSurfaceMaxWidth } from "./dialog-surface";

export type ModalScrimOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly open?: boolean | undefined;
  readonly zIndex?: "z-40" | "z-50" | undefined;
  readonly class?: string | undefined;
  readonly surfaceClass?: string | undefined;
  readonly maxWidth?: DialogSurfaceMaxWidth | undefined;
  readonly ariaLabel?: string | undefined;
  readonly ariaLabelledby?: string | undefined;
  readonly ariaDescribedby?: string | undefined;
  readonly dismissible?: boolean | undefined;
  readonly onDismiss?: (() => M | undefined) | undefined;
  readonly topLayer?: boolean | undefined;
  readonly children: View.Input<M, R>;
};

/**
 * Modal dialog backed by `@effect/ui-kit`'s `Dialog` with LiSCA's scrim and surface styling.
 * Owns focus trapping, focus recovery, Escape dismissal, and backdrop clicks until closed.
 * Omit `onDismiss` (or set `dismissible: false`) for a required decision.
 */
export function ModalScrim<M, R = never>(h: Html.H<M>, options: ModalScrimOptions<M, R>) {
  const dismissible = options.dismissible ?? options.onDismiss !== undefined;
  const maxWidth = options.maxWidth ?? "sm";

  return Dialog(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      open: options.open ?? true,
      modal: true,
      disablePointerDismissal: !dismissible,
      ...(options.topLayer !== undefined ? { topLayer: options.topLayer } : {}),
    },
    onEmit: {
      RequestedOpen: () => undefined,
      RequestedClose: () => (dismissible ? options.onDismiss?.() : undefined),
      Settled: () => undefined,
    },
    view: (dialog) => {
      const portal = dialog.portal(h.dialog);
      if (!portal) {
        return View.text("");
      }
      return portal.children(
        dialog
          .backdrop(h.div)
          ?.attr("data-lisca-slot", "modal-scrim")
          .class(
            cn(DIALOG_OVERLAY_CLASS, "overscroll-contain", options.zIndex ?? "z-50", options.class),
          ),
        (() => {
          let popup = dialog
            .popup(h.div)
            .attr("role", "dialog")
            .attr("aria-modal", "true")
            .attr("data-slot", "dialog-content")
            .attr("data-max-width", maxWidth)
            .attr("data-lisca-slot", "dialog-surface")
            .class(dialogSurfaceClasses({ maxWidth, class: options.surfaceClass }));

          if (options.ariaLabel !== undefined) {
            popup = popup.attr("aria-label", options.ariaLabel);
          }
          if (options.ariaLabelledby !== undefined) {
            popup = popup.attr("aria-labelledby", options.ariaLabelledby);
          }
          if (options.ariaDescribedby !== undefined) {
            popup = popup.attr("aria-describedby", options.ariaDescribedby);
          }
          return popup.children(options.children);
        })(),
      );
    },
  });
}
