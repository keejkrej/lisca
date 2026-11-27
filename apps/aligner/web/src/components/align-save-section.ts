import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { PanelSection, RailActionPair, RailControlStack } from "@lisca/ui/patterns";
import { Effect, Queue, Schema, Stream } from "effect";

import { AlignPageStore, getAlignerState } from "../state/align-page-context";
import { selectAlignNav } from "../state/align-page-selectors";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

const AlignSaveSectionMessage = UiSchema.TaggedEnum({
  Save: {},
  GoBack: {},
  GoNext: {},
});

export const AlignSaveSection = Html.component({
  name: "AlignSaveSection",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: AlignSaveSectionMessage,
  reads: {
    alignPage: AlignPageStore,
  },
}).make({
  init: () => ({}),
  update: {
    Save: ($) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (state && state.workspacePath && state.frame && !state.saving) {
        void state.saveCurrent();
      }
      return $.model;
    },
    GoBack: ($) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (state?.canGoBack) state.goBack();
      return $.model;
    },
    GoNext: ($) => {
      const state = getAlignerState($.reads.alignPage.controllerId);
      if (state?.canGoNext) state.goNext();
      return $.model;
    },
  },
  subscriptions: () => [
    Subscription.make(
      "align-save-shortcuts",
      Stream.callback<typeof AlignSaveSectionMessage.Type>((queue) => {
        if (typeof window === "undefined") return Effect.void;
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.isComposing || event.altKey) return;
          const mod = event.metaKey || event.ctrlKey;
          if (!mod) return;
          if (!event.shiftKey && event.key.toLowerCase() === "s") {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) {
              Queue.offerUnsafe(queue, AlignSaveSectionMessage.Save());
            }
            return;
          }
          if (isEditableTarget(event.target) || event.shiftKey) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) {
              Queue.offerUnsafe(queue, AlignSaveSectionMessage.GoBack());
            }
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) {
              Queue.offerUnsafe(queue, AlignSaveSectionMessage.GoNext());
            }
          }
        };
        window.addEventListener("keydown", onKeyDown, true);
        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            window.removeEventListener("keydown", onKeyDown, true);
          }),
        );
      }),
    ),
  ],
  view: (h) => {
    void h.reads.alignPage.version;
    const state = getAlignerState(h.reads.alignPage.controllerId);
    if (!state) return View.text("");

    const nav = selectAlignNav(state);
    const canSave = Boolean(nav.workspacePath && nav.frame && !nav.saving);
    const saveStateLabel =
      !nav.workspacePath || !nav.frame
        ? null
        : nav.positionSaveState === "changed"
          ? "Unsaved changes"
          : nav.positionSaveState === "saved"
            ? "Saved"
            : "Not saved";

    return PanelSection(h, {
      key: "align-save-section",
      appearance: "rail",
      title: "Action",
      children: RailControlStack(h).children(
        saveStateLabel
          ? h.div
              .class("flex items-center justify-between text-[11px] text-muted-foreground")
              .children(
                h.span.children("Position status"),
                h.span
                  .class(cn(nav.positionSaveState === "changed" && "font-medium text-foreground"))
                  .children(saveStateLabel),
              )
          : undefined,
        Button(h, {
          class: "w-full justify-center",
          disabled: !canSave,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: AlignSaveSectionMessage.Save(),
        })
          .attr("aria-keyshortcuts", "Control+S Meta+S")
          .children("Save"),
        RailActionPair(h, { label: "Position navigation" }).children(
          Button(h, {
            class: "w-full justify-center",
            disabled: !nav.canGoBack,
            size: "sm",
            type: "button",
            variant: "outline",
            onPress: AlignSaveSectionMessage.GoBack(),
          })
            .attr("aria-keyshortcuts", "Control+ArrowLeft Meta+ArrowLeft")
            .attr("data-rail-nav", "")
            .children("Back"),
          Button(h, {
            class: "w-full justify-center",
            disabled: !nav.canGoNext,
            size: "sm",
            type: "button",
            variant: "outline",
            onPress: AlignSaveSectionMessage.GoNext(),
          })
            .attr("aria-keyshortcuts", "Control+ArrowRight Meta+ArrowRight")
            .attr("data-rail-nav", "")
            .children("Next"),
        ),
      ),
    });
  },
});
