import { splitProps, type JSX } from "solid-js";

const modalScrimClass =
  "fixed inset-0 flex items-center justify-center overscroll-contain bg-black/50 px-6";
import { cn } from "../../lib/utils";

export function ModalScrim(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    children?: JSX.Element;
    zIndex?: "z-40" | "z-50";
  },
) {
  const [local, rest] = splitProps(props, ["children", "class", "zIndex"]);
  return (
    <div
      class={cn(modalScrimClass, local.zIndex ?? "z-50", local.class)}
      data-slot="modal-scrim"
      {...rest}
    >
      {local.children}
    </div>
  );
}
