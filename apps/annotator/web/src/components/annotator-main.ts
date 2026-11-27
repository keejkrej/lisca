import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { AnnotationLabel } from "@lisca/contracts";
import { runClientEffect } from "@lisca/client/runtime";
import {
  createSmartSegmentController,
  type SmartSegmentContext,
  type SmartSegmentController,
} from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";
import { AnnotationCanvas, CanvasToastStack } from "@lisca/instrument";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import { Effect, Queue, Schema, Stream } from "effect";

import { annotatorClient } from "../api/annotator-port";
import { AnnotatePageContext, getAnnotateState } from "../state/annotate-page-context";
import { selectAnnotateCanvas, selectAnnotateNav } from "../state/annotate-page-selectors";

type ManagedSmartSegment = {
  readonly controller: SmartSegmentController;
  readonly onStatus: (listener: (status: string | null) => void) => () => void;
  readonly onError: (listener: (error: string | null) => void) => () => void;
};

let nextSmartInstanceSeq = 0;
const smartControllerStore = new Map<string, ManagedSmartSegment>();

function buildSmartSegmentContext(controllerId: string): SmartSegmentContext {
  const state = getAnnotateState(controllerId);
  const canvas = selectAnnotateCanvas(() => state);
  const activeLabelValue =
    canvas.labels.findIndex((label: AnnotationLabel) => label.id === canvas.activeLabelId) + 1;
  return {
    frame: canvas.frame,
    frameKey:
      state.request && state.workspacePath
        ? `${state.workspacePath}:${state.request.pos}:${state.request.roi}:${state.request.channel}:${state.request.time}:${state.request.z}`
        : null,
    tool: canvas.tool,
    activeLabelValue,
    mask: canvas.annotation.current.mask,
    enabled: canvas.canEditSegmentation,
  };
}

function createManagedSmartSegment(controllerId: string): string {
  nextSmartInstanceSeq += 1;
  const instanceId = `annotator-smart-${nextSmartInstanceSeq}`;
  const statusListeners = new Set<(status: string | null) => void>();
  const errorListeners = new Set<(error: string | null) => void>();

  const provider = createRequestSmartSegmentProvider(
    {
      smartSegment: (request, signal) =>
        runClientEffect(annotatorClient.smartSegment(request), signal ? { signal } : undefined),
    },
    {
      workspacePath: () => getAnnotateState(controllerId).workspacePath,
      roiRequest: () => getAnnotateState(controllerId).request,
      contrast: () => getAnnotateState(controllerId).contrast,
    },
  );

  const controller = createSmartSegmentController({
    provider,
    initialContext: buildSmartSegmentContext(controllerId),
    onCommit: (mask) => {
      const canvas = selectAnnotateCanvas(() => getAnnotateState(controllerId));
      canvas.annotation.commit({
        classificationLabelId: canvas.annotation.current.classificationLabelId,
        mask,
      });
    },
    onStatus: (status) => {
      for (const listener of statusListeners) listener(status);
    },
    onError: (error) => {
      for (const listener of errorListeners) listener(error);
    },
  });

  smartControllerStore.set(instanceId, {
    controller,
    onStatus: (listener) => {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
    onError: (listener) => {
      errorListeners.add(listener);
      return () => {
        errorListeners.delete(listener);
      };
    },
  });

  return instanceId;
}

const AnnotatorMainMessage = UiSchema.TaggedEnum({
  SmartStateUpdated: {},
  SmartStatusChanged: { status: Schema.NullOr(Schema.String) },
  SmartErrorChanged: { error: Schema.NullOr(Schema.String) },
  CommittedMask: { mask: Schema.Any },
  ClickedSmartSegment: { x: Schema.Number, y: Schema.Number, negative: Schema.Boolean },
  ClickedSmartErase: { x: Schema.Number, y: Schema.Number },
});

const AnnotatorMainInner = Html.component({
  name: "AnnotatorMainInner",
  props: Schema.Struct({
    controllerId: Schema.String,
    pageVersion: Schema.Number,
  }),
  model: Schema.Struct({
    instanceId: Schema.String,
    smartVersion: Schema.Number,
    smartStatus: Schema.NullOr(Schema.String),
    smartError: Schema.NullOr(Schema.String),
  }),
  message: AnnotatorMainMessage,
}).make({
  init: ($) => {
    const instanceId = createManagedSmartSegment($.props.controllerId);
    return $.set({
      instanceId,
      smartVersion: 0,
      smartStatus: null,
      smartError: null,
    });
  },
  update: {
    SmartStateUpdated: ($) => $.evolve({ smartVersion: (version) => version + 1 }),
    SmartStatusChanged: ($, { status }) => $.evolve({ smartStatus: status }),
    SmartErrorChanged: ($, { error }) => $.evolve({ smartError: error }),
    CommittedMask: ($, { mask }) => {
      const canvas = selectAnnotateCanvas(() => getAnnotateState($.props.controllerId));
      canvas.annotation.commit({
        classificationLabelId: canvas.annotation.current.classificationLabelId,
        mask: mask as Uint8Array,
      });
      return $.model;
    },
    ClickedSmartSegment: ($, click) => {
      const entry = smartControllerStore.get($.model.instanceId);
      if (entry) {
        entry.controller.sync(buildSmartSegmentContext($.props.controllerId));
        void entry.controller.handleClick({
          x: click.x,
          y: click.y,
          negative: click.negative,
        });
      }
      return $.model;
    },
    ClickedSmartErase: ($, click) => {
      const entry = smartControllerStore.get($.model.instanceId);
      if (entry) {
        entry.controller.sync(buildSmartSegmentContext($.props.controllerId));
        void entry.controller.handleEraseClick({
          x: click.x,
          y: click.y,
        });
      }
      return $.model;
    },
  },
  subscriptions: ({ model, props }) => [
    Subscription.make("annotator-smart-lifecycle", model.instanceId, (instanceId) =>
      Stream.callback<typeof AnnotatorMainMessage.Type>((queue) => {
        const entry = smartControllerStore.get(instanceId);
        if (!entry) return Effect.void;

        const unsubState = entry.controller.subscribe(() => {
          Queue.offerUnsafe(queue, AnnotatorMainMessage.SmartStateUpdated());
        });
        const unsubStatus = entry.onStatus((status) => {
          Queue.offerUnsafe(queue, AnnotatorMainMessage.SmartStatusChanged({ status }));
        });
        const unsubError = entry.onError((error) => {
          Queue.offerUnsafe(queue, AnnotatorMainMessage.SmartErrorChanged({ error }));
        });

        return Effect.addFinalizer(() =>
          Effect.sync(() => {
            unsubState();
            unsubStatus();
            unsubError();
            entry.controller.dispose();
            smartControllerStore.delete(instanceId);
          }),
        );
      }),
    ),
    Subscription.make(
      "annotator-smart-sync",
      `${model.instanceId}::${props.controllerId}::${props.pageVersion}`,
      () => {
        const entry = smartControllerStore.get(model.instanceId);
        if (entry) {
          entry.controller.sync(buildSmartSegmentContext(props.controllerId));
        }
        return Stream.empty;
      },
    ),
  ],
  view: (h, model) => {
    const state = getAnnotateState(h.props.controllerId);
    const canvas = selectAnnotateCanvas(() => state);
    const nav = selectAnnotateNav(() => state);
    const entry = smartControllerStore.get(model.instanceId);
    const smartState = entry?.controller.getState();

    const baseToasts = canvas.canvasToasts.map((message) =>
      message.tone !== undefined
        ? { text: message.text, tone: message.tone }
        : { text: message.text },
    );
    const toasts = model.smartError
      ? [{ text: model.smartError, tone: "error" as const }]
      : model.smartStatus
        ? [...baseToasts, { text: model.smartStatus }]
        : baseToasts;

    const pos = nav.selection.pos != null ? String(nav.selection.pos + 1).padStart(2, "0") : "—";
    const captionLeft = `Pos ${pos} · ROI ${nav.selection.roi ?? "—"} · Channel ${nav.selection.channel ?? "—"}`;
    const emptyText = !state.workspacePath
      ? "Pick a workspace to load a frame."
      : state.scanLoading
        ? "Scanning workspace…"
        : state.scanError
          ? state.scanError
          : (state.scan?.positions.length ?? 0) === 0
            ? "No cropped ROIs found in this workspace."
            : "No frame loaded.";

    return ViewportCard(h, {
      children: StageCanvas(h, {
        notice: CanvasToastStack(h, { messages: toasts }),
        captionLeft,
        captionRight: canvas.frame
          ? `${canvas.frame.width} × ${canvas.frame.height} px`
          : "No frame",
        children: AnnotationCanvas(h, {
          key: "annotation-canvas",
          activeLabelId: canvas.activeLabelId,
          brushSize: canvas.brushSize,
          class: "h-full w-full",
          disabled: !canvas.canEditSegmentation || Boolean(smartState?.busy),
          emptyText,
          frame: canvas.frame,
          labels: canvas.labels,
          mask: canvas.annotation.current.mask,
          overlayOpacity: canvas.overlayOpacity,
          smartSegmentPrompts: smartState?.prompts ?? [],
          tool: canvas.tool,
          onMaskCommit: (mask) => AnnotatorMainMessage.CommittedMask({ mask }),
          onSmartSegmentClick: (click) => AnnotatorMainMessage.ClickedSmartSegment(click),
          onSmartEraseClick: (click) => AnnotatorMainMessage.ClickedSmartErase(click),
        }),
      }),
    });
  },
});

export const AnnotatorMain = Html.component({
  name: "AnnotatorMain",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
  reads: {
    page: AnnotatePageContext,
  },
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    AnnotatorMainInner(h, {
      key: h.reads.page.controllerId,
      props: {
        controllerId: h.reads.page.controllerId,
        pageVersion: h.reads.page.version,
      },
    }),
});
