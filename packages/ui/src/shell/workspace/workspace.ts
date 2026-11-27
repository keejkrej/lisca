import { Command, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Effect, Schema } from "effect";

export const ShellWorkspaceSharedSchema = Schema.Struct({
  workspacePath: Schema.NullOr(Schema.String),
  sourcePath: Schema.NullOr(Schema.String),
});

export type ShellWorkspace = typeof ShellWorkspaceSharedSchema.Type;

export const ShellWorkspaceReceives = UiSchema.TaggedEnum({
  SetWorkspacePath: { path: Schema.NullOr(Schema.String) },
  SetSourcePath: { path: Schema.NullOr(Schema.String) },
  ClearSource: {},
  PickWorkspace: {},
  PickSource: {},
});

export type ShellWorkspaceReceives = typeof ShellWorkspaceReceives.Type;

const PromptWorkspaceCommand = Command.make("LiscaPromptWorkspace", { args: {} }, () =>
  Effect.sync(() => {
    const next =
      typeof window === "undefined" ? null : window.prompt("Workspace folder path (dev stub)");
    const trimmed = next?.trim();
    return ShellWorkspaceReceives.SetWorkspacePath({ path: trimmed ? trimmed : null });
  }),
);

const PromptSourceCommand = Command.make("LiscaPromptSource", { args: {} }, () =>
  Effect.sync(() => {
    const next =
      typeof window === "undefined" ? null : window.prompt("Image source path (dev stub)");
    const trimmed = next?.trim();
    return ShellWorkspaceReceives.SetSourcePath({ path: trimmed ? trimmed : null });
  }),
);

/** Dev stub paths via `window.prompt`; swap for native pickers in desktop shells. */
export const ShellWorkspaceProvider = Html.component({
  name: "ShellWorkspaceProvider",
  props: Schema.Struct({
    initialWorkspacePath: Schema.optional(Schema.NullOr(Schema.String)),
    initialSourcePath: Schema.optional(Schema.NullOr(Schema.String)),
  }),
  model: ShellWorkspaceSharedSchema,
  message: ShellWorkspaceReceives,
  shares: {
    value: ({ model }) => model,
    schema: ShellWorkspaceSharedSchema,
    receives: ["SetWorkspacePath", "SetSourcePath", "ClearSource", "PickWorkspace", "PickSource"],
  },
}).make({
  init: ($) => {
    const workspacePath = $.props.initialWorkspacePath ?? null;
    const sourcePath = workspacePath ? ($.props.initialSourcePath ?? null) : null;
    return $.set({ workspacePath, sourcePath });
  },
  update: {
    SetWorkspacePath: ($, { path }) =>
      $.set({
        workspacePath: path,
        sourcePath: path ? $.model.sourcePath : null,
      }),
    SetSourcePath: ($, { path }) => $.evolve({ sourcePath: $.model.workspacePath ? path : null }),
    ClearSource: ($) => $.evolve({ sourcePath: null }),
    PickWorkspace: ($) => $.run(PromptWorkspaceCommand.make()),
    PickSource: ($) => ($.model.workspacePath ? $.run(PromptSourceCommand.make()) : $.model),
  },
  parts: (_p, model) => ({
    workspacePath: model.workspacePath,
    sourcePath: model.sourcePath,
  }),
});
