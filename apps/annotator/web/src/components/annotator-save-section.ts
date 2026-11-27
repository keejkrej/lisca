import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { PanelSection, RailActionPair, RailControlStack } from "@lisca/ui/patterns";
import { Effect, Queue, Schema, Stream } from "effect";

import { AnnotatePageContext, getAnnotateState } from "../state/annotate-page-context";
import { selectAnnotateDock } from "../state/annotate-page-selectors";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

const AnnotatorSaveSectionMessage = UiSchema.TaggedEnum({
  RequestedSave: {},
  RequestedBack: {},
  RequestedNext: {},
});

const watchSaveShortcuts = Stream.callback<typeof AnnotatorSaveSectionMessage.Type>((queue) => {
  if (typeof window === "undefined") return Effect.void;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.altKey) return;
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    if (!event.shiftKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        Queue.offerUnsafe(queue, AnnotatorSaveSectionMessage.RequestedSave());
      }
      return;
    }
    if (isEditableTarget(event.target) || event.shiftKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        Queue.offerUnsafe(queue, AnnotatorSaveSectionMessage.RequestedBack());
      }
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) {
        Queue.offerUnsafe(queue, AnnotatorSaveSectionMessage.RequestedNext());
      }
    }
  };

  window.addEventListener("keydown", onKeyDown, true);
  return Effect.addFinalizer(() =>
    Effect.sync(() => {
      window.removeEventListener("keydown", onKeyDown, true);
    }),
  );
});

export const AnnotatorSaveSection = Html.component({
  name: "AnnotatorSaveSection",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AnnotatorSaveSectionMessage,
  reads: {
    page: AnnotatePageContext,
  },
}).make({
  init: () => ({}),
  update: {
    RequestedSave: ($) => {
      const dock = selectAnnotateDock(() => getAnnotateState($.reads.page.controllerId));
      if (dock.canSave && !dock.saving) {
        void dock.handleSave();
      }
      return $.model;
    },
    RequestedBack: ($) => {
      const dock = selectAnnotateDock(() => getAnnotateState($.reads.page.controllerId));
      if (dock.canGoBack) {
        dock.goBack();
      }
      return $.model;
    },
    RequestedNext: ($) => {
      const dock = selectAnnotateDock(() => getAnnotateState($.reads.page.controllerId));
      if (dock.canGoNext) {
        dock.goNext();
      }
      return $.model;
    },
  },
  subscriptions: () => [Subscription.make("annotator-save-shortcuts", watchSaveShortcuts)],
  view: (h) => {
    const dock = selectAnnotateDock(() => getAnnotateState(h.reads.page.controllerId));

    return PanelSection(h, {
      appearance: "rail",
      title: "Action",
      children: RailControlStack(h).children(
        Button(h, {
          class: "w-full justify-center",
          disabled: !dock.canSave,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: AnnotatorSaveSectionMessage.RequestedSave(),
        })
          .attr("aria-keyshortcuts", "Control+S Meta+S")
          .children("Save"),
        RailActionPair(h, { label: "ROI navigation" }).children(
          Button(h, {
            class: "w-full justify-center",
            disabled: !dock.canGoBack,
            size: "sm",
            type: "button",
            variant: "outline",
            onPress: AnnotatorSaveSectionMessage.RequestedBack(),
          })
            .attr("aria-keyshortcuts", "Control+ArrowLeft Meta+ArrowLeft")
            .attr("data-rail-nav", "")
            .children("Back"),
          Button(h, {
            class: "w-full justify-center",
            disabled: !dock.canGoNext,
            size: "sm",
            type: "button",
            variant: "outline",
            onPress: AnnotatorSaveSectionMessage.RequestedNext(),
          })
            .attr("aria-keyshortcuts", "Control+ArrowRight Meta+ArrowRight")
            .attr("data-rail-nav", "")
            .children("Next"),
        ),
      ),
    });
  },
});
