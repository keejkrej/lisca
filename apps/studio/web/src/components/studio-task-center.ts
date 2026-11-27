import { Component, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  createTaskCenterGateway,
  subscribeTaskCenterTasks,
} from "@lisca/client/session/task-center";
import { TaskCenter, TaskCenterPort, type TaskCenterServiceShape } from "@lisca/instrument";
import { Effect, Layer, Schema } from "effect";

import { studioClient } from "../api/studio-port";
import {
  commandModifierHeld,
  commandModifierHeldSubscription,
} from "../navigation/command-modifier-held";
import { studioCommandShortcutHint } from "../navigation/studio-command-shortcuts";
import { studioPageShortcutPlatform } from "../navigation/studio-page-shortcuts";
import { StudioNavigationProvider } from "../navigation/studio-router";
import {
  commandShortcutKeys,
  studioCommandShortcutSubscription,
} from "../navigation/use-studio-command-shortcut";
import {
  clearStudioTaskCenterOpen,
  studioTaskCenterOpenIsHeld,
  studioTaskCenterOpenScope,
  studioTaskCenterOpenSubscription,
  studioTaskCenterRequestedAt,
} from "./studio-task-center-open";
import {
  filterStudioTasks,
  studioTaskCenterCopy,
  studioTaskScopeForPath,
  type StudioTaskScope,
} from "./studio-task-scope";

const gateway = createTaskCenterGateway(studioClient);

export const studioTaskCenterService: TaskCenterServiceShape = {
  gateway,
  subscribe: ({ onSnapshot, onError }) =>
    subscribeTaskCenterTasks({
      gateway,
      onError,
      onSnapshot,
    }),
};

function scopedTaskCenterLayer(scope: StudioTaskScope) {
  return Layer.effect(
    TaskCenterPort,
    Effect.map(TaskCenterPort, (parent) => {
      const base = parent ?? studioTaskCenterService;
      return {
        gateway: base.gateway,
        subscribe: ({ onSnapshot, onError }) =>
          base.subscribe({
            onError,
            onSnapshot: (snapshot) => onSnapshot(filterStudioTasks(snapshot, scope)),
          }),
      };
    }),
  );
}

const StudioTaskScopeSchema = Schema.Literals(["crop", "analysis"]);

const StudioTaskCenterMsg = UiSchema.TaggedEnum({
  SetOpen: { open: Schema.Boolean },
  ToggleOpen: {},
  OpenScopeChanged: { scope: Schema.NullOr(StudioTaskScopeSchema) },
  ModifierHeldChanged: { held: Schema.Boolean },
});

const StudioTaskCenterBase = Html.component({
  name: "StudioTaskCenter",
  props: Schema.Struct({
    scope: StudioTaskScopeSchema,
  }),
  model: Schema.Struct({
    open: Schema.Boolean,
    modifierHeld: Schema.Boolean,
  }),
  message: StudioTaskCenterMsg,
}).make({
  init: ($) => ({
    open: studioTaskCenterOpenScope() === $.props.scope,
    modifierHeld: commandModifierHeld(),
  }),
  update: {
    SetOpen: ($, { open }) => {
      if (
        !open &&
        studioTaskCenterOpenScope() === $.props.scope &&
        studioTaskCenterOpenIsHeld(studioTaskCenterRequestedAt(), Date.now())
      ) {
        return $.evolve({ open: true });
      }
      if (!open && studioTaskCenterOpenScope() === $.props.scope) {
        clearStudioTaskCenterOpen();
      }
      return $.evolve({ open });
    },
    ToggleOpen: ($) => $.evolve({ open: (current) => !current }),
    OpenScopeChanged: ($, { scope }) =>
      scope === $.props.scope ? $.evolve({ open: true }) : $.model,
    ModifierHeldChanged: ($, { held }) => $.evolve({ modifierHeld: held }),
  },
  subscriptions: () => [
    studioCommandShortcutSubscription("tasks", true, StudioTaskCenterMsg.ToggleOpen()),
    studioTaskCenterOpenSubscription("studio-task-center-open-request", (scope) =>
      StudioTaskCenterMsg.OpenScopeChanged({ scope }),
    ),
    commandModifierHeldSubscription("studio-task-center-cmd", (held) =>
      StudioTaskCenterMsg.ModifierHeldChanged({ held }),
    ),
  ],
  view: (h, model) => {
    const copy = studioTaskCenterCopy(h.props.scope);
    const shortcutHintText = model.modifierHeld
      ? studioCommandShortcutHint("tasks", studioPageShortcutPlatform()).label
      : undefined;

    return TaskCenter(h, {
      key: `task-center-${h.props.scope}`,
      appearance: "status-link",
      description: copy.description,
      emptyMessage: copy.emptyMessage,
      emptyTitle: copy.emptyTitle,
      label: copy.label,
      open: model.open,
      shortcutHintText,
      shortcutKeys: commandShortcutKeys("tasks"),
      title: copy.title,
      onOpenChange: (open) => StudioTaskCenterMsg.SetOpen({ open }),
    });
  },
});

const CropTaskCenterComponent = StudioTaskCenterBase.pipe(
  Component.provide(scopedTaskCenterLayer("crop")),
);

const AnalysisTaskCenterComponent = StudioTaskCenterBase.pipe(
  Component.provide(scopedTaskCenterLayer("analysis")),
);

export type StudioTaskCenterOptions = {
  readonly key?: string | undefined;
  readonly scope: StudioTaskScope;
};

export function StudioTaskCenter<M>(h: Html.H<M>, options: StudioTaskCenterOptions) {
  const target = options.scope === "crop" ? CropTaskCenterComponent : AnalysisTaskCenterComponent;
  return target(h, {
    key: options.key ?? `studio-task-center-${options.scope}`,
    props: { scope: options.scope },
  });
}

const StudioPageTaskCenterComponent = Html.component({
  name: "StudioPageTaskCenter",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
  reads: {
    nav: StudioNavigationProvider,
  },
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) => {
    const scope = studioTaskScopeForPath(h.reads.nav.pathname);
    if (!scope) return View.text("");
    return StudioTaskCenter(h, { key: `studio-page-task-center-${scope}`, scope });
  },
});

export function StudioPageTaskCenter<M>(
  h: Html.H<M>,
  options?: { readonly key?: string | undefined },
) {
  return StudioPageTaskCenterComponent(h, {
    ...(options?.key !== undefined ? { key: options.key } : {}),
    props: {},
  });
}
