import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { StateUpdater } from "@lisca/client/align-session/controller";
import { restoreAlignerWorkSession } from "@lisca/client/session/aligner-work-session-restore";
import {
  createWorkSessionGate,
  type WorkSessionGateController,
} from "@lisca/client/session/work-session-gate";
import {
  ShellWorkspaceProvider,
  ShellWorkspaceReceives,
  WorkSessionPickerDialog,
} from "@lisca/ui/shell";
import { toWorkSessionPickerItems } from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";

import { alignerRegistry } from "../atoms/aligner-registry";
import {
  alignerUiActions,
  alignerUiAtom,
  readAlignerSession,
  type AlignerUiState,
} from "../atoms/aligner-ui-atoms";

type GateEntry = {
  readonly controller: WorkSessionGateController;
  readonly onShellWorkspacePath: (listener: (path: string | null) => void) => () => void;
};

let nextGateCounter = 0;
const gateEntries = new Map<string, GateEntry>();

function nextGateId(): string {
  nextGateCounter += 1;
  return `aligner-work-session-gate-${nextGateCounter}`;
}

function setAlignerUi(update: StateUpdater<AlignerUiState>): void {
  const current = alignerRegistry.get(alignerUiAtom);
  const next = typeof update === "function" ? update(current) : update;
  if (next !== current) {
    alignerRegistry.set(alignerUiAtom, next);
  }
}

const GateMessage = UiSchema.TaggedEnum({
  GateStateChanged: {},
  SetShellWorkspacePath: { path: Schema.NullOr(Schema.String) },
});

const GateDialogMessage = UiSchema.TaggedEnum({
  RestoreSession: { sessionId: Schema.String },
  StartNewSession: {},
});

const AlignerWorkSessionDialog = Html.component({
  name: "AlignerWorkSessionDialog",
  props: Schema.Struct({
    gateId: Schema.String,
    version: Schema.Number,
  }),
  model: Schema.Struct({}),
  message: GateDialogMessage,
}).make({
  init: () => ({}),
  update: {
    RestoreSession: ($, { sessionId }) => {
      const gate = gateEntries.get($.props.gateId)?.controller;
      const target = gate?.getState().sessions.find((session) => session.id === sessionId);
      if (target) {
        gate?.restoreSession(target);
      }
      return $.model;
    },
    StartNewSession: ($) => {
      gateEntries.get($.props.gateId)?.controller.startNewSession();
      return $.model;
    },
  },
  view: (h) => {
    const gate = gateEntries.get(h.props.gateId)?.controller;
    if (!gate) return View.text("");
    const state = gate.getState();
    if (!state.open) return View.text("");
    const pickerItems = toWorkSessionPickerItems(
      "aligner",
      state.sessions.map((session) => ({
        id: session.id,
        lastOpenedAt: session.lastOpenedAt,
        ...(session.label !== undefined ? { label: session.label } : {}),
        ...(session.workspacePath !== undefined ? { workspacePath: session.workspacePath } : {}),
        ...(session.assayJsonPath !== undefined ? { assayJsonPath: session.assayJsonPath } : {}),
        ...(session.source !== undefined ? { source: session.source } : {}),
      })),
    );
    return (
      WorkSessionPickerDialog(h, {
        appId: "aligner",
        open: state.open,
        sessions: pickerItems,
        onRestore: (sessionId) => GateDialogMessage.RestoreSession({ sessionId }),
        onStartNew: GateDialogMessage.StartNewSession(),
      }) ?? View.text("")
    );
  },
});

const AlignerWorkSessionGateState = Html.component({
  name: "AlignerWorkSessionGate",
  props: Schema.Struct({}),
  model: Schema.Struct({
    gateId: Schema.String,
    version: Schema.Number,
    initialWorkspacePath: Schema.NullOr(Schema.String),
  }),
  message: GateMessage,
  reads: {
    workspace: ShellWorkspaceProvider,
  },
}).make({
  init: ($) => {
    const gateId = nextGateId();
    const workspaceListeners = new Set<(path: string | null) => void>();
    const notifyShellWorkspacePath = (path: string | null) => {
      for (const listener of workspaceListeners) listener(path);
    };

    const controller = createWorkSessionGate(
      "aligner",
      async (session) => {
        await restoreAlignerWorkSession({
          session,
          setShellWorkspacePath: notifyShellWorkspacePath,
          setWorkspacePath: alignerUiActions.setWorkspacePath,
          setSource: alignerUiActions.setSource,
          setUi: setAlignerUi,
          resumePendingRuns: async () => {
            // Crop tasks are not owned by Aligner.
          },
        });
      },
      // No resume dialog: the workspace and source pickers list recent picks instead.
      { skipResumePicker: true },
    );

    gateEntries.set(gateId, {
      controller,
      onShellWorkspacePath(listener) {
        workspaceListeners.add(listener);
        return () => {
          workspaceListeners.delete(listener);
        };
      },
    });

    const session = readAlignerSession();
    return $.set({
      gateId,
      version: 0,
      initialWorkspacePath: session?.workspacePath ?? null,
    });
  },
  update: {
    GateStateChanged: ($) => $.evolve({ version: (v) => v + 1 }),
    SetShellWorkspacePath: ($, { path }) =>
      $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetWorkspacePath({ path })),
  },
  subscriptions: ({ model }) => [
    Subscription.make("aligner-work-session-gate", model.gateId, (gateId) =>
      Stream.callback<typeof GateMessage.Type>((queue) => {
        const entry = gateEntries.get(gateId);
        if (!entry) return Effect.void;

        const unsubscribeGate = entry.controller.subscribe(() => {
          Queue.offerUnsafe(queue, GateMessage.GateStateChanged());
        });
        const unsubscribeWorkspace = entry.onShellWorkspacePath((path) => {
          Queue.offerUnsafe(queue, GateMessage.SetShellWorkspacePath({ path }));
        });

        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            unsubscribeGate();
            unsubscribeWorkspace();
            gateEntries.delete(gateId);
          }),
        );
      }),
    ),
    model.initialWorkspacePath !== null &&
      Subscription.make("aligner-initial-workspace-path", model.initialWorkspacePath, (path) =>
        Stream.make(GateMessage.SetShellWorkspacePath({ path })),
      ),
  ],
  parts: (_p, model) => {
    const state = gateEntries.get(model.gateId)?.controller.getState();
    return {
      gateId: model.gateId,
      version: model.version,
      ready: state?.ready ?? true,
      open: state?.open ?? false,
    };
  },
});

export type AlignerWorkSessionGateOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly children: View.Input<M, R>;
};

/** Aligner work-session gate — no crop recovery (crop is Studio/CLI only). */
export function AlignerWorkSessionGate<M, R = never>(
  h: Html.H<M>,
  options: AlignerWorkSessionGateOptions<M, R>,
) {
  return AlignerWorkSessionGateState(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {},
    view: (gate) =>
      h.div.class("contents").children(
        gate.ready ? options.children : undefined,
        gate.open
          ? AlignerWorkSessionDialog(h, {
              key: "work-session-picker",
              props: { gateId: gate.gateId, version: gate.version },
            })
          : undefined,
      ),
  });
}
