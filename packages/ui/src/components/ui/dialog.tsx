import { dialog, type DialogOptions } from "@ui-sdk/core/dialog";
import { splitProps, type ComponentProps, type JSX } from "solid-js";

import { createParts } from "../../lib/ui-sdk";
import { cn } from "../../lib/utils";

const parts = createParts(dialog, {
  trigger: "button",
  backdrop: "div",
  content: "div",
  title: "h2",
  description: "p",
  close: "button",
});

export function Dialog(props: DialogOptions & { children?: JSX.Element }) {
  return <parts.Root {...props} />;
}

export const DialogTrigger = parts.Trigger;
export const DialogClose = parts.Close;

export function DialogOverlay(props: ComponentProps<typeof parts.Backdrop>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <parts.Backdrop class={cn("fixed inset-0 z-50 bg-black/50", local.class)} {...rest} />;
}

export function DialogContent(props: ComponentProps<typeof parts.Content>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <parts.Content
      class={cn(
        "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none",
        local.class,
      )}
      {...rest}
    />
  );
}

export function DialogTitle(props: ComponentProps<typeof parts.Title>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <parts.Title class={cn("z-dialog-title z-font-heading", local.class)} {...rest} />;
}

export function DialogDescription(props: ComponentProps<typeof parts.Description>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <parts.Description class={cn("z-dialog-description", local.class)} {...rest} />;
}

export function DialogHeader(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="dialog-header"
      class={cn("z-dialog-header flex flex-col", local.class)}
      {...rest}
    />
  );
}

export function DialogFooter(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="dialog-footer"
      class={cn(
        "z-dialog-footer flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        local.class,
      )}
      {...rest}
    />
  );
}
