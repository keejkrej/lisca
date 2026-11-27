import { Command, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Schema } from "effect";

import { Button } from "../../components/ui/button";
import {
  Popover,
  POPOVER_CONTENT_CLASS,
  POPOVER_DESCRIPTION_CLASS,
  POPOVER_TITLE_CLASS,
  parsePlacement,
} from "../../components/ui/popover";
import { Icon } from "../../icons";
import { cn } from "../../lib/utils";
import {
  ConnectionStateSchema,
  hasEmbeddedBackend,
  ShellServerProvider,
  ShellServerReceives,
} from "../server/shell-server";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

/** How long "Retry now" shows its busy state; the probe itself keeps running afterwards. */
const RETRY_FEEDBACK_MS = 1_200;

/** Web builds call the server on their own origin (ADR-0003), so the page host is the server. */
function serverHost(): string {
  return typeof window === "undefined" ? "The server" : window.location.host;
}

const ConnectionStatusMessage = UiSchema.TaggedEnum({
  SetOpen: { open: Schema.Boolean },
  ClickedRetry: {},
  ResetRetrying: {},
});

const ConnectionStatusEvents = UiSchema.TaggedEnum({
  Retried: {},
});

const ResetRetryingCommand = Command.make("LiscaConnectionStatusResetRetry", { args: {} }, () =>
  Effect.sleep(`${RETRY_FEEDBACK_MS} millis`).pipe(
    Effect.as(ConnectionStatusMessage.ResetRetrying()),
  ),
);

/**
 * Server reachability, surfaced only when it needs attention. A healthy (or still booting)
 * connection shows nothing; desktop builds never show it because the backend runs in-process.
 */
export const ConnectionStatus = Html.component({
  name: "ConnectionStatus",
  props: Schema.Struct({
    state: Schema.optional(ConnectionStateSchema),
  }),
  model: Schema.Struct({
    open: Schema.Boolean,
    retrying: Schema.Boolean,
  }),
  message: ConnectionStatusMessage,
  events: ConnectionStatusEvents,
  reads: {
    server: { owner: ShellServerProvider, optional: true },
  },
}).make({
  init: () => ({ open: false, retrying: false }),
  update: {
    SetOpen: ($, { open }) => $.evolve({ open }),
    ClickedRetry: ($) =>
      $.send(ShellServerProvider, ShellServerReceives.Retry())
        .evolve({ retrying: true })
        .emit(ConnectionStatusEvents.Retried())
        .run(ResetRetryingCommand.make()),
    ResetRetrying: ($) => $.evolve({ retrying: false }),
  },
  view: (h, model) => {
    const state = h.props.state ?? h.reads.server?.state ?? "idle";
    if (state !== "closed" || hasEmbeddedBackend()) {
      return View.text("");
    }

    const pos = parsePlacement("bottom-end", 4);
    const isDev = Boolean(
      (import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } }).env?.DEV,
    );

    return Popover(h, {
      props: {
        open: model.open,
        side: pos.side,
        align: pos.align,
        sideOffset: pos.sideOffset,
      },
      onEmit: {
        RequestedOpen: () => ConnectionStatusMessage.SetOpen({ open: true }),
        RequestedClose: () => ConnectionStatusMessage.SetOpen({ open: false }),
        Settled: () => undefined,
      },
      view: (popover) =>
        h.span.class("inline-flex").children(
          popover
            .trigger({ element: h.button })
            .attr("aria-label", "Server unreachable")
            .attr("data-lisca-slot", "connection-status")
            .attr("data-state", state)
            .attr("title", serverHost())
            .class(
              "z-destructive-surface flex h-7 cursor-pointer items-center gap-1.5 border px-2 text-xs font-medium",
            )
            .children(
              Icon(h, "warning-circle", { class: "size-3.5 shrink-0" }),
              "Server unreachable",
            ),
          popover.portal(h.dialog)?.children(
            popover
              .positioner(h.div)
              .class("z-50")
              .children(
                popover
                  .popup(h.div)
                  .class(cn(POPOVER_CONTENT_CLASS, "flex w-80 flex-col gap-3 p-4"))
                  .children(
                    h.div
                      .class("flex flex-col gap-1.5")
                      .children(
                        popover
                          .title(h.h2)
                          .class(POPOVER_TITLE_CLASS)
                          .children("Can't reach the server"),
                        popover
                          .description(h.p)
                          .class(POPOVER_DESCRIPTION_CLASS)
                          .children(
                            `${serverHost()} isn't responding. Nothing on this page is lost; the app keeps retrying and picks up where you left off once the server is back.`,
                          ),
                      ),
                    h.p
                      .class("text-xs leading-relaxed text-muted-foreground")
                      .children(
                        isDev
                          ? "Development: check the Rust server is still running in your dev terminal. It stops answering while it recompiles after a code change."
                          : "Deployment: the server behind this page stopped responding. Restart it (for Docker, restart the container) or contact whoever runs it.",
                      ),
                    Button(h, {
                      class: "self-start",
                      disabled: model.retrying,
                      size: "sm",
                      type: "button",
                      variant: "outline",
                      onPress: ConnectionStatusMessage.ClickedRetry(),
                    }).children(model.retrying ? "Retrying…" : "Retry now"),
                  ),
              ),
          ),
        ),
    });
  },
});
