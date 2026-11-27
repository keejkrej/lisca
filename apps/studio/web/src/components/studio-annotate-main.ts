import type { Html } from "@effect/ui/html";
import {
  AnnotationCanvas,
  CanvasToastStack,
  type CanvasToastStackOptions,
} from "@lisca/instrument";
import type { SmartSegmentState } from "@lisca/smart/segment";
import { StageCanvas, ViewportCard } from "@lisca/ui/shell";

type CanvasStatusMessage = NonNullable<CanvasToastStackOptions["messages"]>[number];

import {
  selectStudioAnnotateCanvas,
  selectStudioAnnotateNav,
} from "../state/studio-annotate-page-selectors";
import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import {
  annotateStagePlaceholder,
  StudioStagePlaceholderView,
  studioStagePlaceholderRoute,
} from "./studio-stage-placeholder";

export type StudioAnnotateMainOptions<M> = {
  readonly state: StudioAnnotateState;
  readonly smartSegmentState: SmartSegmentState;
  readonly smartSegmentStatus: string | null;
  readonly smartSegmentError: string | null;
  readonly onNavigate: (to: string) => M;
  readonly onMaskCommit: (mask: Uint8Array) => M;
  readonly onSmartSegmentClick: (click: {
    readonly x: number;
    readonly y: number;
    readonly negative: boolean;
  }) => M;
  readonly onSmartEraseClick: (click: { readonly x: number; readonly y: number }) => M;
};

export function StudioAnnotateMain<M>(h: Html.H<M>, options: StudioAnnotateMainOptions<M>) {
  const { state, smartSegmentState, smartSegmentStatus, smartSegmentError } = options;
  const canvas = selectStudioAnnotateCanvas(state);
  const nav = selectStudioAnnotateNav(state);

  const baseToasts: CanvasStatusMessage[] = canvas.canvasToasts.map((m) =>
    m.tone !== undefined ? { text: m.text, tone: m.tone } : { text: m.text },
  );
  const toasts: CanvasStatusMessage[] = smartSegmentError
    ? [{ text: smartSegmentError, tone: "error" }]
    : smartSegmentStatus
      ? [...baseToasts, { text: smartSegmentStatus }]
      : baseToasts;

  const placeholder = annotateStagePlaceholder({
    workspaceMissing: state.workspaceMissing,
    scanLoading: state.scanLoading,
    positionCount: state.scan ? state.scan.positions.length : null,
    scanError: state.scanError,
  });

  if (placeholder) {
    return StudioStagePlaceholderView(h, {
      title: placeholder.title,
      description: placeholder.description,
      actionLabel: placeholder.actionLabel,
      ...(placeholder.action !== undefined
        ? { onAction: options.onNavigate(studioStagePlaceholderRoute(placeholder.action)) }
        : {}),
    });
  }

  return ViewportCard(h, {
    children: StageCanvas(h, {
      notice: CanvasToastStack(h, { messages: toasts }),
      captionLeft: `ROI ${nav.selection.roi ?? "—"} · Channel ${nav.selection.channel ?? "—"}`,
      captionRight: canvas.frame ? `${canvas.frame.width} × ${canvas.frame.height} px` : "No frame",
      children: AnnotationCanvas(h, {
        key: "studio-annotation-canvas",
        activeLabelId: canvas.activeLabelId,
        brushSize: canvas.brushSize,
        class: "h-full w-full",
        disabled: !canvas.canEditSegmentation || smartSegmentState.busy,
        frame: canvas.frame,
        labels: canvas.labels,
        mask: canvas.annotation.current.mask,
        overlayOpacity: canvas.overlayOpacity,
        smartSegmentPrompts: smartSegmentState.prompts,
        tool: canvas.tool,
        onMaskCommit: options.onMaskCommit,
        onSmartSegmentClick: options.onSmartSegmentClick,
        onSmartEraseClick: options.onSmartEraseClick,
      }),
    }),
  });
}
