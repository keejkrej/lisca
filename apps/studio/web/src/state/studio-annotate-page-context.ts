import { runClientEffect } from "@lisca/client/runtime";
import {
  createSmartSegmentController,
  type SmartSegmentController,
  type SmartSegmentState,
} from "@lisca/smart/segment";
import { createRequestSmartSegmentProvider } from "@lisca/smart/segment/request";

import { studioClient } from "../api/studio-port";
import {
  createStudioAnnotateController,
  type StudioAnnotateState,
} from "./use-studio-annotate-state";

export type StudioAnnotatePageContextValue = {
  readonly state: StudioAnnotateState;
  readonly smartSegment: SmartSegmentController;
  readonly smartSegmentState: SmartSegmentState;
  readonly smartSegmentStatus: string | null;
  readonly smartSegmentError: string | null;
  readonly onMaskCommit: (mask: Uint8Array) => void;
};

export type StudioAnnotatePageController = {
  readonly getContext: () => StudioAnnotatePageContextValue;
  readonly getState: () => StudioAnnotateState;
  readonly setNavigate: (navigate: (to: string) => void) => void;
  readonly subscribe: (listener: () => void) => () => void;
  readonly dispose: () => void;
};

function smartFrameKey(state: StudioAnnotateState): string | null {
  return state.request && state.workspacePath
    ? `${state.workspacePath}:${state.request.pos}:${state.request.roi}:${state.request.channel}:${state.request.time}:${state.request.z}`
    : null;
}

function activeLabelValueFor(state: StudioAnnotateState): number {
  return state.labels.findIndex((label) => label.id === state.activeLabelId) + 1;
}

export function createStudioAnnotatePageController(options?: {
  readonly onNavigate?: ((to: string) => void) | undefined;
}): StudioAnnotatePageController {
  let disposed = false;
  let navigateFn: (to: string) => void = options?.onNavigate ?? (() => {});
  let smartSegmentStatus: string | null = null;
  let smartSegmentError: string | null = null;

  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    for (const listener of listeners) listener();
  };

  const annotateController = createStudioAnnotateController({
    onNavigate: (to) => navigateFn(to),
  });

  const onMaskCommit = (mask: Uint8Array) => {
    const state = annotateController.getState();
    state.annotation.commit({
      classificationLabelId: state.annotation.current.classificationLabelId,
      mask,
    });
  };

  const smartSegmentProvider = createRequestSmartSegmentProvider(
    {
      smartSegment: (request, signal) =>
        runClientEffect(studioClient.smartSegment(request), signal ? { signal } : undefined),
    },
    {
      workspacePath: () => annotateController.getState().workspacePath,
      roiRequest: () => annotateController.getState().request,
      contrast: () => annotateController.getState().contrast,
    },
  );

  const initial = annotateController.getState();

  const smartSegment = createSmartSegmentController({
    provider: smartSegmentProvider,
    initialContext: {
      frame: initial.frame,
      frameKey: smartFrameKey(initial),
      tool: initial.tool,
      activeLabelValue: activeLabelValueFor(initial),
      mask: initial.annotation.current.mask,
      enabled: initial.canEditSegmentation,
    },
    onCommit: onMaskCommit,
    onStatus: (status) => {
      if (smartSegmentStatus !== status) {
        smartSegmentStatus = status;
        notify();
      }
    },
    onError: (error) => {
      if (smartSegmentError !== error) {
        smartSegmentError = error;
        notify();
      }
    },
  });

  const syncSmartSegment = () => {
    const state = annotateController.getState();
    smartSegment.sync({
      frame: state.frame,
      frameKey: smartFrameKey(state),
      tool: state.tool,
      activeLabelValue: activeLabelValueFor(state),
      mask: state.annotation.current.mask,
      enabled: state.canEditSegmentation,
    });
  };

  const unsubscribeAnnotate = annotateController.subscribe(() => {
    syncSmartSegment();
    notify();
  });
  const unsubscribeSmart = smartSegment.subscribe(notify);

  const getContext = (): StudioAnnotatePageContextValue => ({
    state: annotateController.getState(),
    smartSegment,
    smartSegmentState: smartSegment.getState(),
    smartSegmentStatus,
    smartSegmentError,
    onMaskCommit,
  });

  return {
    getContext,
    getState: () => annotateController.getState(),
    setNavigate(navigate) {
      navigateFn = navigate;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      unsubscribeAnnotate();
      unsubscribeSmart();
      smartSegment.dispose();
      annotateController.dispose();
      listeners.clear();
    },
  };
}

const annotateControllers = new Map<string, StudioAnnotatePageController>();
let nextAnnotateInstanceSeq = 0;

export function nextStudioAnnotateInstanceId(): string {
  nextAnnotateInstanceSeq += 1;
  return `studio-annotate-${nextAnnotateInstanceSeq}`;
}

export function getOrCreateStudioAnnotatePageController(
  instanceId: string,
): StudioAnnotatePageController {
  const existing = annotateControllers.get(instanceId);
  if (existing) return existing;
  const created = createStudioAnnotatePageController();
  annotateControllers.set(instanceId, created);
  return created;
}

export function disposeStudioAnnotatePageController(instanceId: string): void {
  const controller = annotateControllers.get(instanceId);
  if (!controller) return;
  annotateControllers.delete(instanceId);
  controller.dispose();
}
