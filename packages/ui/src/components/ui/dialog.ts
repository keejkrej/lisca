import type { Html } from "@effect/ui/html";
import {
  Dialog as KitDialog,
  DialogTrigger as KitDialogTrigger,
  type DialogDismissReason,
  type DialogModal,
} from "@effect/ui-kit";

import { cn } from "../../lib/utils";

export { KitDialog as Dialog, KitDialogTrigger as DialogTrigger };
export type { DialogDismissReason, DialogModal };

export const DIALOG_OVERLAY_CLASS = "fixed inset-0 z-50 bg-black/50";
export const DIALOG_VIEWPORT_CLASS = "fixed inset-0 z-50 flex items-center justify-center";
export const DIALOG_CONTENT_CLASS =
  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none";
export const DIALOG_TITLE_CLASS = "z-dialog-title z-font-heading";
export const DIALOG_DESCRIPTION_CLASS = "z-dialog-description";

export type DialogHeaderOptions = {
  readonly class?: string | undefined;
};

export function DialogHeader<M>(h: Html.H<M>, options: DialogHeaderOptions = {}) {
  return h.div
    .attr("data-slot", "dialog-header")
    .class(cn("z-dialog-header flex flex-col", options.class));
}

export type DialogFooterOptions = {
  readonly class?: string | undefined;
};

export function DialogFooter<M>(h: Html.H<M>, options: DialogFooterOptions = {}) {
  return h.div
    .attr("data-slot", "dialog-footer")
    .class(
      cn("z-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", options.class),
    );
}
