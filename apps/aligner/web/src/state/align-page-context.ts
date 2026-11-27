import { Subscription, UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { ShellWorkspaceProvider, ShellWorkspaceReceives } from "@lisca/ui/shell";
import { Effect, Queue, Schema, Stream } from "effect";

import {
  createAlignerController,
  type AlignState,
  type AlignerController,
} from "./use-align-state";

let nextControllerCounter = 0;
const controllers = new Map<string, AlignerController>();

function nextAlignerControllerId(): string {
  nextControllerCounter += 1;
  return `aligner-controller-${nextControllerCounter}`;
}

export function getAlignerController(controllerId: string): AlignerController | undefined {
  return controllers.get(controllerId);
}

export function getAlignerState(controllerId: string): AlignState | undefined {
  return controllers.get(controllerId)?.getState();
}

export const AlignPageSharedSchema = Schema.Struct({
  controllerId: Schema.String,
  version: Schema.Number,
});

export type AlignPageShared = typeof AlignPageSharedSchema.Type;

const AlignPageMessage = UiSchema.TaggedEnum({
  StateChanged: {},
  SyncShellWorkspacePath: { path: Schema.NullOr(Schema.String) },
  SyncShellSourcePath: { path: Schema.NullOr(Schema.String) },
});

export const AlignPageStore = Html.component({
  name: "AlignPageStore",
  props: Schema.Struct({
    workspacePath: Schema.NullOr(Schema.String),
    sourcePath: Schema.NullOr(Schema.String),
  }),
  model: AlignPageSharedSchema,
  message: AlignPageMessage,
  reads: {
    workspace: ShellWorkspaceProvider,
  },
  shares: {
    value: ({ model }) => ({
      controllerId: model.controllerId,
      version: model.version,
    }),
    schema: AlignPageSharedSchema,
  },
}).make({
  init: ($) => {
    const controllerId = nextAlignerControllerId();
    const controller = createAlignerController({
      initialWorkspacePath: $.props.workspacePath,
      initialSourcePath: $.props.sourcePath,
    });
    controllers.set(controllerId, controller);
    return $.set({ controllerId, version: 0 });
  },
  update: {
    StateChanged: ($) => $.evolve({ version: (v) => v + 1 }),
    SyncShellWorkspacePath: ($, { path }) =>
      $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetWorkspacePath({ path })),
    SyncShellSourcePath: ($, { path }) =>
      $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetSourcePath({ path })),
  },
  subscriptions: ({ model, props }) => [
    Subscription.make("aligner-controller", model.controllerId, (controllerId) =>
      Stream.callback<typeof AlignPageMessage.Type>((queue) => {
        const controller = controllers.get(controllerId);
        if (!controller) return Effect.void;

        const unsubscribeState = controller.subscribe(() => {
          Queue.offerUnsafe(queue, AlignPageMessage.StateChanged());
        });
        const unsubscribeShell = controller.subscribeShellSync((event) => {
          Queue.offerUnsafe(
            queue,
            event.kind === "workspace"
              ? AlignPageMessage.SyncShellWorkspacePath({ path: event.path })
              : AlignPageMessage.SyncShellSourcePath({ path: event.path }),
          );
        });

        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            unsubscribeState();
            unsubscribeShell();
            controller.dispose();
            controllers.delete(controllerId);
          }),
        );
      }),
    ),
    Subscription.make(
      "aligner-shell-workspace-sync",
      [model.controllerId, props.workspacePath, props.sourcePath] as const,
      ([controllerId, workspacePath, sourcePath]) =>
        Stream.unwrap(
          Effect.sync(() => {
            controllers.get(controllerId)?.syncShellWorkspace(workspacePath, sourcePath);
            return Stream.empty;
          }),
        ),
    ),
  ],
  parts: (_p, model) => ({
    controllerId: model.controllerId,
    version: model.version,
  }),
});

const AlignPageWorkspaceReader = Html.component({
  name: "AlignPageWorkspaceReader",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
  reads: {
    workspace: ShellWorkspaceProvider,
  },
}).make({
  init: () => ({}),
  update: ($) => $.model,
  parts: (p) => ({
    workspacePath: p.reads.workspace.workspacePath,
    sourcePath: p.reads.workspace.sourcePath,
  }),
});

export type AlignPageProviderOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly children: View.Content<M, R>;
};

export function AlignPageProvider<M, R = never>(
  h: Html.H<M>,
  options: AlignPageProviderOptions<M, R>,
) {
  return AlignPageWorkspaceReader(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {},
    view: (ws) =>
      AlignPageStore(h, {
        props: {
          workspacePath: ws.workspacePath,
          sourcePath: ws.sourcePath,
        },
        view: () => options.children,
      }),
  });
}
