import { Command, Subscription, UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AlignUiState, StateUpdater } from "@lisca/client/atoms/align-ui";
import type { StudioWizardData } from "@lisca/client/atoms/studio-ui";
import { runClientEffect } from "@lisca/client/runtime";
import { resumeStudioPendingRuns } from "@lisca/client/session/resume-pending-runs";
import { restoreStudioWorkSession } from "@lisca/client/session/studio-work-session-restore";
import { createSubscriptionOwner } from "@lisca/client/session/subscription-owner";
import type { AnalysisProgress } from "@lisca/contracts";
import type { StudioAssayJson } from "@lisca/contracts/assay";
import {
  ShellServerProvider,
  ShellWorkspaceProvider,
  ShellWorkspaceReceives,
} from "@lisca/ui/shell";
import { Effect, Queue, Schema, Stream } from "effect";

import { studioMockAssayPath } from "../api/studio-mock";
import { studioClient } from "../api/studio-port";
import { invalidateRoiWorkspaceAtom } from "../atoms/studio-query-atoms";
import {
  readStudioAlignSession,
  studioAlignUiActions,
  studioAlignUiAtom,
} from "../state/studio-align-store";
import {
  studioAnnotateUiActions,
  studioAnnotateUiAtom,
  type StudioAnnotateStoreState,
} from "../state/studio-annotate-store";
import { bindStudioCropRefresh, bindStudioCropSettled } from "../state/studio-crop-watch";
import { setStudioAtom, studioRegistry } from "../state/studio-registry";
import {
  setActiveStudioSession,
  type StudioSessionContextValue,
} from "../state/studio-session-context";
import { parseStudioAssayJson, studioWizardActions, studioWizardAtom } from "../state/studio-store";

/** Cold `cargo watch` can take minutes. Once the server is up, a bad file should stop. */
const MOCK_OPEN_RETRY_MS = 1_000;
const MOCK_OPEN_COLD_ATTEMPTS = 180;
const MOCK_OPEN_READY_ATTEMPTS = 5;

/** Vite opens `/`, which redirects to Assay. Leave a later page alone on refresh. */
function studioMockStartsOnAssay(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return (
    hash === "" ||
    hash === "#" ||
    hash === "#/" ||
    hash === "#/assay" ||
    hash.startsWith("#/onboarding")
  );
}

async function restoreStudioSession(
  assayJsonPath: string,
  setWizard: (update: StateUpdater<StudioWizardData>) => void,
  setAlignUi: (update: StateUpdater<AlignUiState>) => void,
  setAnnotateUi: (update: StateUpdater<StudioAnnotateStoreState>) => void,
  setShellWorkspacePath: (path: string | null) => void,
  attachPendingRuns: (workspacePath: string) => Promise<void>,
): Promise<StudioAssayJson> {
  let loaded: StudioAssayJson | undefined;
  await restoreStudioWorkSession({
    assayJsonPath,
    readAssayJson: async (path) => {
      const contents = await runClientEffect(studioClient.readTextFile(path));
      loaded = parseStudioAssayJson(contents);
      return loaded;
    },
    loadAssayJson: (assayJson) => studioWizardActions.loadAssayJson(setWizard, assayJson),
    setShellWorkspacePath,
    setAlignWorkspacePath: (path) => studioAlignUiActions.setWorkspacePath(setAlignUi, path),
    setAnnotateWorkspacePath: (path) =>
      studioAnnotateUiActions.setWorkspacePath(setAnnotateUi, path),
    setAlignSource: (source) => studioAlignUiActions.setSource(setAlignUi, source),
    // Reattach in the background: a lookup failure must not block opening the assay.
    resumePendingRuns: async (workspacePath) => {
      void attachPendingRuns(workspacePath).catch(() => undefined);
    },
  });
  return loaded!;
}

const WorkSessionGateMsg = UiSchema.TaggedEnum({
  SetShellWorkspacePath: { path: Schema.NullOr(Schema.String) },
  MockAttemptRequested: {},
  MockAttemptFinished: { ok: Schema.Boolean },
});

const TryOpenMockAssayCmd = Command.make(
  "StudioMockOpenAssay",
  { args: { path: Schema.String } },
  ({ path }) =>
    Effect.tryPromise({
      try: async () => {
        const { getActiveStudioSession } = await import("../state/studio-session-context");
        await getActiveStudioSession().openAssay(path);
        return true;
      },
      catch: () => false,
    }).pipe(
      Effect.catch(() => Effect.succeed(false)),
      Effect.map((ok) => WorkSessionGateMsg.MockAttemptFinished({ ok })),
    ),
);

const ScheduleMockRetryCmd = Command.make("StudioMockRetryDelay", { args: {} }, () =>
  Effect.sleep(`${MOCK_OPEN_RETRY_MS} millis`).pipe(
    Effect.as(WorkSessionGateMsg.MockAttemptRequested()),
  ),
);

const WorkSessionGateHost = Html.component({
  name: "StudioWorkSessionGate",
  props: Schema.Struct({}),
  model: Schema.Struct({
    coldAttempts: Schema.Number,
    readyAttempts: Schema.Number,
    mockDone: Schema.Boolean,
  }),
  message: WorkSessionGateMsg,
  reads: {
    server: ShellServerProvider,
    workspace: ShellWorkspaceProvider,
  },
}).make({
  init: () => ({
    coldAttempts: 0,
    readyAttempts: 0,
    mockDone: studioMockAssayPath() === null,
  }),
  update: {
    SetShellWorkspacePath: ($, { path }) =>
      $.send(ShellWorkspaceProvider, ShellWorkspaceReceives.SetWorkspacePath({ path })),
    MockAttemptRequested: ($) => {
      const mockPath = studioMockAssayPath();
      if ($.model.mockDone || !mockPath) return $.model;
      return $.run(TryOpenMockAssayCmd.make({ path: mockPath }));
    },
    MockAttemptFinished: ($, { ok }) => {
      if (ok) {
        if (studioMockStartsOnAssay() && typeof window !== "undefined") {
          window.location.hash = "#/metadata";
        }
        return $.evolve({ mockDone: true });
      }
      if ($.reads.server.state === "open") {
        const readyAttempts = $.model.readyAttempts + 1;
        if (readyAttempts >= MOCK_OPEN_READY_ATTEMPTS) {
          return $.evolve({ readyAttempts, mockDone: true });
        }
        return $.evolve({ readyAttempts }).run(ScheduleMockRetryCmd.make());
      }
      const coldAttempts = $.model.coldAttempts + 1;
      if (coldAttempts >= MOCK_OPEN_COLD_ATTEMPTS) {
        return $.evolve({ coldAttempts, mockDone: true });
      }
      return $.evolve({ coldAttempts }).run(ScheduleMockRetryCmd.make());
    },
  },
  subscriptions: () => [
    Subscription.make("studio-work-session-lifecycle", "mounted", () =>
      Stream.callback<typeof WorkSessionGateMsg.Type>((queue) => {
        const pendingRunSubscription = createSubscriptionOwner();
        const setWizard = (update: StateUpdater<StudioWizardData>) =>
          setStudioAtom(studioWizardAtom, update);
        const setAlignUi = (update: StateUpdater<AlignUiState>) =>
          setStudioAtom(studioAlignUiAtom, update);
        const setAnnotateUi = (update: StateUpdater<StudioAnnotateStoreState>) =>
          setStudioAtom(studioAnnotateUiAtom, update);
        const invalidateRoi = (workspacePath: string) => {
          studioRegistry.set(invalidateRoiWorkspaceAtom, workspacePath);
        };

        const setShellWorkspacePath = (path: string | null) => {
          Queue.offerUnsafe(queue, WorkSessionGateMsg.SetShellWorkspacePath({ path }));
        };

        const releaseCropRefresh = bindStudioCropRefresh((workspacePath) => {
          invalidateRoi(workspacePath);
        });
        const releaseCropSettled = bindStudioCropSettled((progress, cropWorkspace) => {
          const current = studioRegistry.get(studioAlignUiAtom);
          if (current.workspacePath !== cropWorkspace) return;
          const activeId = current.cropProgress?.requestId;
          if (activeId != null && activeId !== progress.requestId) return;
          studioAlignUiActions.setCropProgress(setAlignUi, progress);
        });

        const attachPendingRuns = async (workspacePath: string) => {
          await pendingRunSubscription.replace(() =>
            resumeStudioPendingRuns({
              client: studioClient,
              workspacePath,
              onCropProgress: (progress) =>
                studioAlignUiActions.setCropProgress(setAlignUi, progress),
              onRestoredCropTerminal: (progress) => {
                if (progress.status === "error") {
                  studioAlignUiActions.setError(
                    setAlignUi,
                    progress.error ?? progress.message ?? "Crop failed",
                  );
                } else {
                  studioAlignUiActions.setStatus(setAlignUi, progress.message ?? "Crop finished");
                }
                invalidateRoi(workspacePath);
              },
              onAnalysisProgress: (progress: AnalysisProgress) =>
                studioAnnotateUiActions.setAnalysisProgress(setAnnotateUi, progress),
            }),
          );
        };

        const openAssay = (assayJsonPath: string) =>
          restoreStudioSession(
            assayJsonPath,
            setWizard,
            setAlignUi,
            setAnnotateUi,
            setShellWorkspacePath,
            attachPendingRuns,
          );

        const sessionValue: StudioSessionContextValue = { openAssay };
        setActiveStudioSession(sessionValue);

        const mockAssayPath = studioMockAssayPath();
        const alignSession = readStudioAlignSession();
        if (alignSession) {
          studioAlignUiActions.setSpacingZoomLocked(setAlignUi, alignSession.spacingZoomLocked);
          studioAlignUiActions.setPatternZoomLocked(setAlignUi, alignSession.patternZoomLocked);
        }
        // The mock opens its fixture once the server answers. A saved session would
        // flash a different workspace first.
        if (!mockAssayPath && alignSession?.workspacePath) {
          setShellWorkspacePath(alignSession.workspacePath);
          void attachPendingRuns(alignSession.workspacePath);
        }
        if (mockAssayPath) {
          Queue.offerUnsafe(queue, WorkSessionGateMsg.MockAttemptRequested());
        }

        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            releaseCropRefresh();
            releaseCropSettled();
            pendingRunSubscription.clear();
            setActiveStudioSession(null);
          }),
        );
      }),
    ),
  ],
  parts: () => ({}),
});

export type StudioWorkSessionGateOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly children: View.Input<M, R>;
};

export function StudioWorkSessionGate<M, R = never>(
  h: Html.H<M>,
  options: StudioWorkSessionGateOptions<M, R>,
) {
  return WorkSessionGateHost(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {},
    view: () => h.div.class("contents").children(options.children),
  });
}
