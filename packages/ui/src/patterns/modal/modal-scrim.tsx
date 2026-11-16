import { splitProps, type JSX } from "solid-js";

import { Dialog, DialogOverlay } from "../../components/ui/dialog";
import { cn } from "../../lib/utils";

/** A mounted modal owns focus until it closes. Omit onDismiss for a required decision. */
export function ModalScrim(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    children?: JSX.Element;
    zIndex?: "z-40" | "z-50";
    onDismiss?: () => void;
    dismissible?: boolean;
  },
) {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "zIndex",
    "onDismiss",
    "dismissible",
  ]);
  return (
    <Dialog
      defaultOpen
      dismissible={local.dismissible ?? !!local.onDismiss}
      onOpenChangeComplete={(open) => {
        if (!open) local.onDismiss?.();
      }}
    >
      <DialogOverlay
        class={cn("overscroll-contain", local.zIndex ?? "z-50", local.class)}
        data-lisca-slot="modal-scrim"
        {...rest}
      />
      {local.children}
    </Dialog>
  );
}
