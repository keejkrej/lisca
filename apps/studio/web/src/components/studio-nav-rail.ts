import { Component, Mount, Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Queue, Schema, Stream } from "effect";

import {
  commandModifierHeld,
  commandModifierHeldSubscription,
} from "../navigation/command-modifier-held";
import {
  STUDIO_PAGES,
  studioHorizontalHistoryArrow,
  studioPageForShortcut,
  studioPageShortcutHint,
  studioPageShortcutPlatform,
  studioPageStepHint,
  studioPageStepTarget,
} from "../navigation/studio-page-shortcuts";
import {
  StudioNavigationMessage,
  StudioNavigationProvider,
  type StudioRouteTo,
} from "../navigation/studio-router";
import { confirmStudioAnnotateLeave } from "../state/studio-annotate-guard";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

const STEP_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;
// Carry the last step position across mounts so the rail animates smoothly between routes.
let previousStepIndex: number | undefined;

function stepLabel(index: number): string {
  return STEP_ROMAN[index - 1] ?? String(index);
}

/** Keeps ⌘ and the key in fixed columns so ↑/↓ line up with 1–5. */
function RailChordHint<M>(h: Html.H<M>, label: string) {
  const prefix = label.startsWith("⌘") ? "⌘" : label.startsWith("Ctrl+") ? "Ctrl+" : "";
  const key = prefix ? label.slice(prefix.length) : label;
  return h.span
    .attr("aria-hidden", "true")
    .class(
      "ml-auto inline-flex shrink-0 items-center text-[10px] font-medium leading-none text-current",
    )
    .children(
      h.span.children(prefix),
      h.span.class("inline-flex w-3 justify-center").children(key),
    );
}

const AnimateStepTrack = Mount.make(
  "StudioNavRailTrackAnimate",
  { args: { stepIndex: Schema.Number } },
  (el: HTMLDivElement, { stepIndex }) =>
    Effect.scoped(
      Effect.acquireRelease(
        Effect.sync(() => {
          const previous = previousStepIndex;
          previousStepIndex = stepIndex;
          if (
            previous === undefined ||
            previous === stepIndex ||
            !el.animate ||
            (typeof window !== "undefined" &&
              window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
          ) {
            return null;
          }
          const animation = el.animate(
            [
              { transform: `translateY(${-previous * 2.5}rem)` },
              { transform: `translateY(${-stepIndex * 2.5}rem)` },
            ],
            { duration: 300, easing: "ease-in-out" },
          );
          animation.finished?.catch(() => undefined);
          return animation;
        }),
        (animation) =>
          Effect.sync(() => {
            animation?.cancel();
          }),
      ).pipe(Effect.andThen(Effect.never), Effect.as(Component.noop)),
    ),
);

const StudioNavRailMsg = UiSchema.TaggedEnum({
  SetModifierHeld: { held: Schema.Boolean },
  GoTo: { to: Schema.String },
  StepPage: { key: Schema.Literals(["ArrowUp", "ArrowDown"]) },
});

const StudioNavRailComponent = Html.component({
  name: "StudioNavRail",
  props: Schema.Struct({}),
  model: Schema.Struct({
    modifierHeld: Schema.Boolean,
  }),
  message: StudioNavRailMsg,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({ modifierHeld: commandModifierHeld() }),
  update: {
    SetModifierHeld: ($, { held }) => $.evolve({ modifierHeld: held }),
    GoTo: ($, { to }) => {
      const current = $.reads.nav.pathname.slice(1) || "assay";
      if (current === to.slice(1)) return $.model;
      if (current === "annotate" && !confirmStudioAnnotateLeave()) return $.model;
      return $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to }));
    },
    StepPage: ($, { key }) => {
      const current = `/${$.reads.nav.pathname.slice(1) || "assay"}` as StudioRouteTo;
      const shortcutPlatform = studioPageShortcutPlatform();
      const step = studioPageStepTarget(
        {
          key,
          editableTarget: false,
          metaKey: shortcutPlatform === "mac",
          ctrlKey: shortcutPlatform !== "mac",
          shiftKey: false,
          altKey: false,
        },
        shortcutPlatform,
        current,
      );
      const to = step?.to;
      if (!to) return $.model;
      if (current === "/annotate" && !confirmStudioAnnotateLeave()) return $.model;
      return $.send(StudioNavigationProvider, StudioNavigationMessage.Navigate({ to }));
    },
  },
  subscriptions: () => [
    commandModifierHeldSubscription("studio-nav-rail-cmd-held", (held) =>
      StudioNavRailMsg.SetModifierHeld({ held }),
    ),
    Subscription.make("studio-nav-rail-keys", "mounted", () => {
      if (typeof window === "undefined") return Stream.empty;
      const shortcutPlatform = studioPageShortcutPlatform();
      return Stream.callback<typeof StudioNavRailMsg.Type>((queue) => {
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.isComposing) return;
          const context = {
            key: event.key,
            editableTarget: isEditableTarget(event.target),
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          };
          if (studioHorizontalHistoryArrow(context, shortcutPlatform)) {
            event.preventDefault();
            return;
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            const step = studioPageStepTarget(context, shortcutPlatform, "/assay");
            if (step) {
              event.preventDefault();
              if (!event.repeat) {
                Queue.offerUnsafe(queue, StudioNavRailMsg.StepPage({ key: event.key }));
              }
              return;
            }
          }
          if (event.repeat) return;
          const to = studioPageForShortcut(context, shortcutPlatform);
          if (!to) return;
          event.preventDefault();
          Queue.offerUnsafe(queue, StudioNavRailMsg.GoTo({ to }));
        };

        window.addEventListener("keydown", onKeyDown, true);
        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            window.removeEventListener("keydown", onKeyDown, true);
          }),
        );
      });
    }),
  ],
  view: (h, model) => {
    const routeId = h.reads.nav.pathname.slice(1) || "assay";
    const activeStepIndex = Math.max(
      0,
      STUDIO_PAGES.findIndex((page) => page.to.slice(1) === routeId),
    );
    const shortcutPlatform = studioPageShortcutPlatform();
    const modifier = shortcutPlatform === "mac" ? "Meta" : "Control";

    const endHint = (direction: "up" | "down") =>
      model.modifierHeld
        ? h.span
            .attr("aria-hidden", "true")
            .class(
              "flex items-center pr-3 pl-8 text-[10px] font-medium leading-none text-foreground",
            )
            .children(RailChordHint(h, studioPageStepHint(direction, shortcutPlatform)))
        : undefined;

    return h.nav
      .attr("aria-label", "Primary")
      .class("flex h-full min-h-0 flex-col justify-center py-2.5")
      .children(
        h.div
          .class("ml-rail-inset flex max-h-full w-rail-content min-h-0 min-w-0 flex-col gap-1")
          .children(
            h.div.class("h-3 shrink-0").children(endHint("up")),
            h.div.class("relative h-[22.25rem] min-h-9 shrink overflow-hidden").children(
              h.div
                .attr("aria-hidden", "true")
                .attr("data-slot", "studio-step-window")
                .class(
                  "pointer-events-none absolute inset-x-0 top-1/2 z-10 h-9 -translate-y-1/2 border border-primary",
                ),
              // The date-wheel track moves under the stationary current-step window.
              h.div
                .attr("data-slot", "studio-step-track")
                .class(
                  "absolute inset-x-0 top-1/2 -mt-4.5 flex flex-col gap-1 transition-transform duration-300 ease-in-out motion-reduce:transition-none",
                )
                .style({ transform: `translateY(${-activeStepIndex * 2.5}rem)` })
                .onMount(AnimateStepTrack({ stepIndex: activeStepIndex }))
                .children(
                  ...STUDIO_PAGES.map((page) => {
                    const active = routeId === page.to.slice(1);
                    const hint = studioPageShortcutHint(page.index, shortcutPlatform);
                    let link = h.a
                      .key(page.to)
                      .attr("href", `#${page.to}`)
                      .attr("aria-keyshortcuts", `${modifier}+${page.index}`)
                      .class(
                        `group flex h-9 w-full min-w-0 shrink-0 items-center gap-3 bg-transparent pr-3 pl-8 text-left text-foreground outline-none transition-colors focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring${active ? "" : " hover:bg-secondary"}`,
                      )
                      .on(
                        "click",
                        (event) => {
                          if (
                            event.meta ||
                            event.ctrl ||
                            event.shift ||
                            event.alt ||
                            event.button !== 0
                          ) {
                            return undefined;
                          }
                          return StudioNavRailMsg.GoTo({ to: page.to });
                        },
                        { preventDefault: true },
                      );

                    if (active) {
                      link = link.attr("aria-current", "page");
                    }

                    return link.children(
                      h.span
                        .attr("aria-hidden", "true")
                        .class("w-7 shrink-0 text-left text-[11px] leading-[14px] tabular-nums")
                        .children(stepLabel(page.index)),
                      h.span
                        .class("min-w-0 truncate text-sm leading-[18px] font-medium")
                        .children(page.label),
                      model.modifierHeld ? RailChordHint(h, hint) : undefined,
                    );
                  }),
                ),
            ),
            h.div.class("h-3 shrink-0").children(endHint("down")),
          ),
      );
  },
});

export function StudioNavRail<M>(h: Html.H<M>, options?: { readonly key?: string | undefined }) {
  return StudioNavRailComponent(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: {},
  });
}
