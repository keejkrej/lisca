import { Subscription, UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { ShellWorkspaceProvider, ShellWorkspaceReceives } from "@lisca/ui/shell";
import { Effect, Queue, Schema, Stream } from "effect";

import { annotatorRegistry } from "../atoms/annotator-ui-atoms";
import {
  createAnnotateStateController,
  type AnnotateState,
  type AnnotateStateController,
} from "./use-annotate-state";

type ManagedAnnotateController = {
  readonly controller: AnnotateStateController;
  readonly owned: boolean;
  readonly getWorkspacePath: () => string | null;
  readonly setExternalWorkspacePath: (path: string | null) => void;
  readonly onWorkspacePathChange: (listener: (path: string | null) => void) => () => void;
  readonly consumePendingShellSync: () => { hasPending: boolean; path: string | null };
};

let nextControllerSeq = 0;
const controllerStore = new Map<string, ManagedAnnotateController>();

function makeControllerId(prefix: string): string {
  nextControllerSeq += 1;
  return `${prefix}-${nextControllerSeq}`;
}

function createManagedAnnotateController(initialWorkspacePath: string | null): string {
  const controllerId = makeControllerId("annotate-page");
  let workspacePath: string | null = initialWorkspacePath;
  let hasPendingShellSync = false;
  let pendingShellPath: string | null = null;
  const workspaceListeners = new Set<(path: string | null) => void>();

  const controller = createAnnotateStateController({
    registry: annotatorRegistry,
    workspace: {
      getWorkspacePath: () => workspacePath,
      setWorkspacePath: (nextPath) => {
        workspacePath = nextPath;
        if (workspaceListeners.size === 0) {
          hasPendingShellSync = true;
          pendingShellPath = nextPath;
        } else {
          for (const listener of workspaceListeners) {
            listener(nextPath);
          }
        }
      },
    },
  });

  controllerStore.set(controllerId, {
    controller,
    owned: true,
    getWorkspacePath: () => workspacePath,
    setExternalWorkspacePath: (nextPath) => {
      workspacePath = nextPath;
    },
    onWorkspacePathChange: (listener) => {
      workspaceListeners.add(listener);
      return () => {
        workspaceListeners.delete(listener);
      };
    },
    consumePendingShellSync: () => {
      if (!hasPendingShellSync) {
        return { hasPending: false, path: null };
      }
      hasPendingShellSync = false;
      return { hasPending: true, path: pendingShellPath };
    },
  });

  return controllerId;
}

export function registerAnnotateController(controller: AnnotateStateController): {
  readonly controllerId: string;
  readonly dispose: () => void;
} {
  const controllerId = makeControllerId("annotate-external");
  let workspacePath: string | null = controller.getState().workspacePath;

  controllerStore.set(controllerId, {
    controller,
    owned: false,
    getWorkspacePath: () => workspacePath,
    setExternalWorkspacePath: (nextPath) => {
      workspacePath = nextPath;
    },
    onWorkspacePathChange: () => () => {},
    consumePendingShellSync: () => ({ hasPending: false, path: null }),
  });

  return {
    controllerId,
    dispose: () => {
      controllerStore.delete(controllerId);
    },
  };
}

export function getAnnotateState(controllerId: string): AnnotateState {
  const entry = controllerStore.get(controllerId);
  if (!entry) {
    throw new Error(`AnnotatePageProvider controller "${controllerId}" is not mounted`);
  }
  return entry.controller.getState();
}

export const AnnotatePageSharedSchema = Schema.Struct({
  controllerId: Schema.String,
  version: Schema.Number,
});

export type AnnotatePageShared = typeof AnnotatePageSharedSchema.Type;

const AnnotatePageMessage = UiSchema.TaggedEnum({
  StateUpdated: {},
  RequestedShellWorkspace: { path: Schema.NullOr(Schema.String) },
});

const WorkspaceReader = Html.component({
  name: "AnnotateWorkspaceReader",
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
  }),
});

export const AnnotatePageContext = Html.component({
  name: "AnnotatePageContext",
  props: Schema.Struct({
    controllerId: Schema.optional(Schema.String),
    workspacePath: Schema.NullOr(Schema.String),
  }),
  model: AnnotatePageSharedSchema,
  message: AnnotatePageMessage,
  reads: {
    workspace: ShellWorkspaceProvider,
  },
  shares: {
    value: ({ model }) => model,
    schema: AnnotatePageSharedSchema,
  },
}).make({
  init: ($) => {
    const controllerId =
      $.props.controllerId ?? createManagedAnnotateController($.props.workspacePath);
    return $.set({ controllerId, version: 0 });
  },
  update: {
    StateUpdated: ($) => $.evolve({ version: (version) => version + 1 }),
    RequestedShellWorkspace: ($, { path }) =>
      $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetWorkspacePath({ path })),
  },
  subscriptions: ({ model, props }) => {
    const workspaceKey =
      props.workspacePath === null
        ? `${model.controllerId}::null`
        : `${model.controllerId}::set:${props.workspacePath}`;

    return [
      Subscription.make("annotate-controller-lifecycle", model.controllerId, (controllerId) =>
        Stream.callback<typeof AnnotatePageMessage.Type>((queue) => {
          const entry = controllerStore.get(controllerId);
          if (!entry) return Effect.void;

          const unsubState = entry.controller.subscribe(() => {
            Queue.offerUnsafe(queue, AnnotatePageMessage.StateUpdated());
          });
          const unsubWorkspace = entry.onWorkspacePathChange((path) => {
            Queue.offerUnsafe(queue, AnnotatePageMessage.RequestedShellWorkspace({ path }));
          });

          const pending = entry.consumePendingShellSync();
          if (pending.hasPending) {
            Queue.offerUnsafe(
              queue,
              AnnotatePageMessage.RequestedShellWorkspace({ path: pending.path }),
            );
          }

          return Effect.addFinalizer(() =>
            Effect.sync(() => {
              unsubState();
              unsubWorkspace();
              if (entry.owned) {
                entry.controller.dispose();
                controllerStore.delete(controllerId);
              }
            }),
          );
        }),
      ),
      Subscription.make("annotate-shell-workspace-sync", workspaceKey, () => {
        const entry = controllerStore.get(model.controllerId);
        if (entry && entry.getWorkspacePath() !== props.workspacePath) {
          entry.setExternalWorkspacePath(props.workspacePath);
          entry.controller.syncExternal();
        }
        return Stream.empty;
      }),
    ];
  },
  parts: (_p, model) => ({
    controllerId: model.controllerId,
    version: model.version,
  }),
});

export function AnnotatePageProvider<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly key?: string | undefined;
    readonly controllerId?: string | undefined;
    readonly children: View.Content<M, R>;
  },
) {
  return WorkspaceReader(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {},
    view: (ws) =>
      AnnotatePageContext(h, {
        props: {
          ...(options.controllerId !== undefined ? { controllerId: options.controllerId } : {}),
          workspacePath: ws.workspacePath,
        },
        view: () => options.children,
      }),
  });
}
