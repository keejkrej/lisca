import { Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AlignGridPatternCoord } from "@lisca/contracts";
import {
  AlignCanvas,
  CanvasToastStack,
  createAlignCanvasPointerHandlers,
  createCanvasTransientStatus,
} from "@lisca/instrument";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { createDefaultAlignGrid } from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";

import { AlignPageStore, getAlignerState } from "../state/align-page-context";
import { selectAlignCanvas, selectAlignNav } from "../state/align-page-selectors";

type MainRuntime = {
  readonly pointer: ReturnType<typeof createAlignCanvasPointerHandlers>;
  readonly transientStatus: ReturnType<typeof createCanvasTransientStatus>;
  readonly onPointerVisualChange: (listener: () => void) => () => void;
};

let nextRuntimeCounter = 0;
const mainRuntimes = new Map<string, MainRuntime>();

function createMainRuntime(controllerId: string): { id: string; runtime: MainRuntime } {
  nextRuntimeCounter += 1;
  const id = `aligner-main-${nextRuntimeCounter}`;
  const pointerListeners = new Set<() => void>();
  const notifyPointerVisual = () => {
    for (const listener of pointerListeners) listener();
  };

  const fallbackGrid = createDefaultAlignGrid();
  const pointer = createAlignCanvasPointerHandlers(() => {
    const state = getAlignerState(controllerId);
    if (!state) {
      return {
        grid: fallbackGrid,
        onCommit: () => {},
        toolMode: "pan",
        spacingZoomLocked: true,
        patternZoomLocked: true,
        manualExclusionEnabled: false,
        excludedPatterns: [],
        frame: null,
        onExcludedPatternsChange: () => {},
      };
    }
    return {
      grid: state.effectiveGrid,
      onCommit: state.commitCanvas,
      toolMode: state.toolMode,
      spacingZoomLocked: state.spacingZoomLocked,
      patternZoomLocked: state.patternZoomLocked,
      manualExclusionEnabled: state.manualExclusionEnabled,
      excludedPatterns: state.currentExcludedPatterns,
      frame: state.frame,
      onExcludedPatternsChange: (patterns: AlignGridPatternCoord[]) =>
        state.setExcludedPatternsForCurrentPosition(patterns),
      onDraggingChange: notifyPointerVisual,
      onSelectingChange: notifyPointerVisual,
    };
  });

  const transientStatus = createCanvasTransientStatus({
    initialStatus: getAlignerState(controllerId)?.status ?? null,
  });

  const runtime: MainRuntime = {
    pointer,
    transientStatus,
    onPointerVisualChange(listener) {
      pointerListeners.add(listener);
      return () => {
        pointerListeners.delete(listener);
      };
    },
  };

  mainRuntimes.set(id, runtime);
  return { id, runtime };
}

const AlignerMainMessage = UiSchema.TaggedEnum({
  VisibleStatusChanged: { status: Schema.NullOr(Schema.String) },
  PointerVisualChanged: {},
});

const AlignerMainInner = Html.component({
  name: "AlignerMainInner",
  props: Schema.Struct({
    controllerId: Schema.String,
    version: Schema.Number,
    status: Schema.NullOr(Schema.String),
  }),
  model: Schema.Struct({
    runtimeId: Schema.String,
    visibleStatus: Schema.NullOr(Schema.String),
    pointerVersion: Schema.Number,
  }),
  message: AlignerMainMessage,
}).make({
  init: ($) => {
    const { id, runtime } = createMainRuntime($.props.controllerId);
    return $.set({
      runtimeId: id,
      visibleStatus: runtime.transientStatus.getVisibleStatus(),
      pointerVersion: 0,
    });
  },
  update: {
    VisibleStatusChanged: ($, { status }) => $.evolve({ visibleStatus: status }),
    PointerVisualChanged: ($) => $.evolve({ pointerVersion: (v) => v + 1 }),
  },
  subscriptions: ({ model, props }) => [
    Subscription.make("aligner-main-runtime", model.runtimeId, (runtimeId) =>
      Stream.callback<typeof AlignerMainMessage.Type>((queue) => {
        const runtime = mainRuntimes.get(runtimeId);
        if (!runtime) return Effect.void;

        const unsubscribeStatus = runtime.transientStatus.subscribe((nextStatus) => {
          Queue.offerUnsafe(queue, AlignerMainMessage.VisibleStatusChanged({ status: nextStatus }));
        });
        const unsubscribePointer = runtime.onPointerVisualChange(() => {
          Queue.offerUnsafe(queue, AlignerMainMessage.PointerVisualChanged());
        });

        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            unsubscribeStatus();
            unsubscribePointer();
            runtime.transientStatus.dispose();
            mainRuntimes.delete(runtimeId);
          }),
        );
      }),
    ),
    Subscription.make(
      "aligner-main-status",
      [model.runtimeId, props.status] as const,
      ([runtimeId, nextStatus]) =>
        Stream.unwrap(
          Effect.sync(() => {
            mainRuntimes.get(runtimeId)?.transientStatus.setStatus(nextStatus);
            return Stream.empty;
          }),
        ),
    ),
  ],
  view: (h, model) => {
    void h.props.version;
    void model.pointerVersion;
    const state = getAlignerState(h.props.controllerId);
    const runtime = mainRuntimes.get(model.runtimeId);
    if (!state || !runtime) return View.text("");

    const canvas = selectAlignCanvas(state);
    const nav = selectAlignNav(state);
    const { pointer } = runtime;

    const activeToastStatus = canvas.frameLoading
      ? "Loading frame"
      : canvas.scanLoading
        ? "Scanning source"
        : model.visibleStatus;

    const toasts = canvas.error
      ? [{ text: canvas.error, tone: "error" as const }]
      : activeToastStatus
        ? [{ text: activeToastStatus }]
        : [];

    const emptyText = !canvas.workspacePath
      ? "Pick a workspace."
      : !canvas.source
        ? "Pick a source."
        : canvas.scanLoading
          ? "Scanning source…"
          : "No frame loaded.";

    const positionLabel = (() => {
      const index = nav.scan?.positions.indexOf(nav.selection.pos) ?? -1;
      const explicit = index >= 0 ? nav.scan?.positionLabels?.[index] : undefined;
      const displayIndex = index >= 0 ? index + 1 : nav.selection.pos + 1;
      return explicit?.trim() || String(displayIndex).padStart(2, "0");
    })();

    return ViewportCard(h, {
      children: StageCanvas(h, {
        notice: CanvasToastStack(h, { messages: toasts }),
        captionLeft: `Position ${positionLabel}`,
        captionRight: canvas.frame
          ? `${canvas.frame.width} × ${canvas.frame.height} px`
          : "No frame",
        children: AlignCanvas(h, {
          class: "h-full w-full",
          cursor: pointer.cursor(),
          emptyText,
          excludedPatterns: canvas.displayedExcludedPatterns,
          frame: canvas.frame,
          grid: canvas.effectiveGrid,
          toolMode: canvas.toolMode,
          previewGridRef: pointer.previewGridRef,
          previewRedrawRef: pointer.previewRedrawRef,
          onVirtualPointerCancel: pointer.handlePointerCancel,
          onVirtualPointerDown: pointer.handlePointerDown,
          onVirtualPointerMove: pointer.handlePointerMove,
          onVirtualPointerUp: pointer.handlePointerEnd,
        }),
      }),
    });
  },
});

export const AlignerMain = Html.component({
  name: "AlignerMain",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
  reads: {
    alignPage: AlignPageStore,
  },
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) => {
    const state = getAlignerState(h.reads.alignPage.controllerId);
    return AlignerMainInner(h, {
      key: h.reads.alignPage.controllerId,
      props: {
        controllerId: h.reads.alignPage.controllerId,
        version: h.reads.alignPage.version,
        status: state?.status ?? null,
      },
    });
  },
});
