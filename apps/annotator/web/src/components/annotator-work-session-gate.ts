import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AnnotatorUiState, StateUpdater } from "@lisca/client/atoms/annotator-ui";
import { restoreAnnotatorWorkSession } from "@lisca/client/session/annotator-work-session-restore";
import {
  createWorkSessionGate,
  type WorkSession,
  type WorkSessionGateController,
} from "@lisca/client/session/work-session-gate";
import {
  ShellWorkspaceProvider,
  ShellWorkspaceReceives,
  WorkSessionPickerDialog,
} from "@lisca/ui/shell";
import { toWorkSessionPickerItems } from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";

import {
  annotatorRegistry,
  annotatorUiActions,
  annotatorUiAtom,
  readAnnotatorSession,
} from "../atoms/annotator-ui-atoms";

type WorkSessionGateEntry = {
  readonly controller: WorkSessionGateController;
  readonly onShellWorkspacePath: (listener: (path: string | null) => void) => () => void;
};

let nextGateSeq = 0;
const gateStore = new Map<string, WorkSessionGateEntry>();

function createManagedGate(): string {
  nextGateSeq += 1;
  const gateId = `annotator-work-session-gate-${nextGateSeq}`;
  const workspaceListeners = new Set<(path: string | null) => void>();

  const setUi = (update: StateUpdater<AnnotatorUiState>) => {
    const current = annotatorRegistry.get(annotatorUiAtom);
    const next = typeof update === "function" ? update(current) : update;
    if (next !== current) {
      annotatorRegistry.set(annotatorUiAtom, next);
    }
  };

  const controller = createWorkSessionGate(
    "annotator",
    (session: WorkSession) => {
      void restoreAnnotatorWorkSession({
        session,
        setShellWorkspacePath: (path) => {
          for (const listener of workspaceListeners) {
            listener(path);
          }
        },
        setWorkspacePath: annotatorUiActions.setWorkspacePath,
        setUi,
      });
    },
    // No resume dialog: the workspace and source pickers list recent picks instead.
    { skipResumePicker: true },
  );

  gateStore.set(gateId, {
    controller,
    onShellWorkspacePath: (listener) => {
      workspaceListeners.add(listener);
      return () => {
        workspaceListeners.delete(listener);
      };
    },
  });

  return gateId;
}

const GateSharedSchema = Schema.Struct({
  gateId: Schema.String,
  version: Schema.Number,
});

const GateMessage = UiSchema.TaggedEnum({
  GateUpdated: {},
  RequestedShellWorkspace: { path: Schema.NullOr(Schema.String) },
});

const AnnotatorWorkSessionGateRoot = Html.component({
  name: "AnnotatorWorkSessionGate",
  props: Schema.Struct({}),
  model: GateSharedSchema,
  message: GateMessage,
  reads: {
    workspace: ShellWorkspaceProvider,
  },
  shares: {
    value: ({ model }) => model,
    schema: GateSharedSchema,
  },
}).make({
  init: ($) => {
    const gateId = createManagedGate();
    return $.set({ gateId, version: 0 });
  },
  update: {
    GateUpdated: ($) => $.evolve({ version: (version) => version + 1 }),
    RequestedShellWorkspace: ($, { path }) =>
      $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetWorkspacePath({ path })),
  },
  subscriptions: ({ model }) => [
    Subscription.make("annotator-work-session-gate", model.gateId, (gateId) =>
      Stream.callback<typeof GateMessage.Type>((queue) => {
        const entry = gateStore.get(gateId);
        if (!entry) return Effect.void;

        const session = readAnnotatorSession();
        if (session?.workspacePath) {
          Queue.offerUnsafe(
            queue,
            GateMessage.RequestedShellWorkspace({ path: session.workspacePath }),
          );
        }

        const unsubGate = entry.controller.subscribe(() => {
          Queue.offerUnsafe(queue, GateMessage.GateUpdated());
        });
        const unsubWorkspace = entry.onShellWorkspacePath((path) => {
          Queue.offerUnsafe(queue, GateMessage.RequestedShellWorkspace({ path }));
        });

        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            unsubGate();
            unsubWorkspace();
            gateStore.delete(gateId);
          }),
        );
      }),
    ),
  ],
  parts: (_p, model) => {
    const entry = gateStore.get(model.gateId);
    const state = entry?.controller.getState();
    return {
      ready: state?.ready ?? true,
    };
  },
});

const GateDialogMessage = UiSchema.TaggedEnum({
  RestoredSession: { sessionId: Schema.String },
  StartedNewSession: {},
});

const AnnotatorWorkSessionDialog = Html.component({
  name: "AnnotatorWorkSessionDialog",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: GateDialogMessage,
  reads: {
    gate: AnnotatorWorkSessionGateRoot,
  },
}).make({
  init: () => ({}),
  update: {
    RestoredSession: ($, { sessionId }) => {
      const entry = gateStore.get($.reads.gate.gateId);
      const session = entry?.controller
        .getState()
        .sessions.find((candidate) => candidate.id === sessionId);
      if (session) {
        entry?.controller.restoreSession(session);
      }
      return $.model;
    },
    StartedNewSession: ($) => {
      const entry = gateStore.get($.reads.gate.gateId);
      entry?.controller.startNewSession();
      return $.model;
    },
  },
  view: (h) => {
    const entry = gateStore.get(h.reads.gate.gateId);
    const state = entry?.controller.getState();
    if (!state || !state.open) return View.text("");

    return (
      WorkSessionPickerDialog(h, {
        appId: "annotator",
        open: state.open,
        sessions: toWorkSessionPickerItems(
          "annotator",
          state.sessions.map((session) => ({
            id: session.id,
            lastOpenedAt: session.lastOpenedAt,
            ...(session.label !== undefined ? { label: session.label } : {}),
            ...(session.workspacePath !== undefined
              ? { workspacePath: session.workspacePath }
              : {}),
            ...(session.assayJsonPath !== undefined
              ? { assayJsonPath: session.assayJsonPath }
              : {}),
            ...(session.source !== undefined ? { source: session.source } : {}),
          })),
        ),
        onRestore: (sessionId) => GateDialogMessage.RestoredSession({ sessionId }),
        onStartNew: GateDialogMessage.StartedNewSession(),
      }) ?? View.text("")
    );
  },
});

export function AnnotatorWorkSessionGate<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly key?: string | undefined;
    readonly children?: View.Input<M, R> | undefined;
  },
) {
  return AnnotatorWorkSessionGateRoot(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {},
    view: (gate) =>
      h.div
        .class("h-full min-h-0")
        .children(
          gate.ready ? options.children : undefined,
          AnnotatorWorkSessionDialog(h, { key: "work-session-dialog", props: {} }),
        ),
  });
}
