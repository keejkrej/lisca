import type { Html } from "@effect/ui/html";
import {
  createWorkSessionPickerState,
  formatWorkSessionWhen,
  workSessionPickerDescription,
  type LiscaAppId,
  type WorkSessionPickerItem,
} from "@lisca/utils";

import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { ModalScrim } from "../../patterns/modal/modal-scrim";

export type WorkSessionPickerDialogOptions<M> = {
  readonly key?: string | undefined;
  readonly appId: LiscaAppId;
  readonly open: boolean;
  readonly sessions: readonly WorkSessionPickerItem[];
  readonly onRestore: (sessionId: string) => M;
  readonly onStartNew: M;
};

export type WorkSessionPickerDialogProps<M = never> = WorkSessionPickerDialogOptions<M>;

export function WorkSessionPickerDialog<M>(
  h: Html.H<M>,
  options: WorkSessionPickerDialogOptions<M>,
) {
  const state = createWorkSessionPickerState(options.open, [...options.sessions]);
  if (!state.open) {
    return undefined;
  }

  return ModalScrim(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    zIndex: "z-50",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabel: "Resume a recent session",
    dismissible: false,
    children: h.div.class("space-y-4").children(
      h.div.children(
        h.h2.class("font-medium text-foreground").children("Resume a session"),
        h.p
          .class("text-muted-foreground text-sm")
          .children(workSessionPickerDescription(options.appId)),
      ),
      ScrollArea(h, {
        viewportClass: "max-h-72",
        children: h.ul.class("space-y-2").children(
          ...state.items.map((item) =>
            h.li.key(item.id).children(
              h.button
                .attr("type", "button")
                .class("w-full rounded-md border border-border px-3 py-2 text-left hover:bg-muted")
                .on("click", options.onRestore(item.id))
                .children(
                  h.div.class("font-medium text-foreground text-sm").children(item.label),
                  h.div.class("truncate text-muted-foreground text-xs").children(item.path),
                  item.sourcePath
                    ? h.div
                        .class("truncate text-muted-foreground text-xs")
                        .children(item.sourcePath)
                    : undefined,
                  h.div
                    .class("text-muted-foreground text-xs")
                    .children(formatWorkSessionWhen(item.lastOpenedAt)),
                ),
            ),
          ),
        ),
      }),
      Button(h, {
        class: "w-full justify-center",
        size: "sm",
        type: "button",
        variant: "outline",
        onPress: options.onStartNew,
      }).children("Start new session"),
    ),
  });
}
