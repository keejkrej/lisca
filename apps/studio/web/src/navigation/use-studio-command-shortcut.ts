import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Queue, Schema, Stream } from "effect";

import { commandModifierHeld, commandModifierHeldSubscription } from "./command-modifier-held";
import { studioPageShortcutPlatform } from "./studio-page-shortcuts";
import {
  studioCommandForShortcut,
  studioCommandShortcutHint,
  type StudioCommandShortcut,
} from "./studio-command-shortcuts";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * Effect UI subscription that listens for a Studio command shortcut while mounted,
 * so Assay Open/New and each page's Save do not fire from the other steps.
 */
export function studioCommandShortcutSubscription<M>(
  command: StudioCommandShortcut,
  enabled: boolean,
  message: M,
) {
  return Subscription.make(`studio-cmd-${command}`, enabled, (isEnabled) => {
    if (typeof window === "undefined") return Stream.empty;
    const platform = studioPageShortcutPlatform();
    return Stream.callback<M>((queue) => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.isComposing) return;
        const match = studioCommandForShortcut(
          {
            key: event.key,
            editableTarget: isEditableTarget(event.target),
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          },
          platform,
        );
        if (match !== command) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat || !isEnabled) return;
        Queue.offerUnsafe(queue, message);
      };

      window.addEventListener("keydown", onKeyDown, true);
      return Effect.addFinalizer(() =>
        Effect.sync(() => {
          window.removeEventListener("keydown", onKeyDown, true);
        }),
      );
    });
  });
}

export function commandShortcutKeys(command: StudioCommandShortcut): string {
  return studioCommandShortcutHint(command, studioPageShortcutPlatform()).aria;
}

const CommandHintMsg = UiSchema.TaggedEnum({
  SetHeld: { held: Schema.Boolean },
});

const CommandHintComponent = Html.component({
  name: "StudioCommandShortcutHint",
  props: Schema.Struct({
    label: Schema.String,
    inline: Schema.Boolean,
  }),
  model: Schema.Struct({
    held: Schema.Boolean,
  }),
  message: CommandHintMsg,
}).make({
  init: () => ({ held: commandModifierHeld() }),
  update: {
    SetHeld: ($, { held }) => $.evolve({ held }),
  },
  subscriptions: () => [
    commandModifierHeldSubscription("studio-cmd-hint-held", (held) =>
      CommandHintMsg.SetHeld({ held }),
    ),
  ],
  view: (h, model) => {
    if (!model.held) return View.text("");
    return h.kbd
      .attr("aria-hidden", "true")
      .class(
        h.props.inline
          ? "pointer-events-none shrink-0 font-[inherit] text-[10px] font-medium leading-none text-current"
          : "pointer-events-none absolute right-2 font-[inherit] text-[10px] font-medium leading-none text-current",
      )
      .children(h.props.label);
  },
});

export type CommandShortcutHintOptions = {
  readonly key?: string | undefined;
  readonly command: StudioCommandShortcut;
  /** `inline` sits in the row after the label. The default overlays the control's right edge. */
  readonly placement?: "corner" | "inline" | undefined;
};

export function CommandShortcutHint<M>(h: Html.H<M>, options: CommandShortcutHintOptions) {
  const hint = studioCommandShortcutHint(options.command, studioPageShortcutPlatform());
  return CommandHintComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      label: hint.label,
      inline: options.placement === "inline",
    },
  });
}
