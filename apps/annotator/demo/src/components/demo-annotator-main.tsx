import { Panel, StageCanvas, ViewportCard } from "@lisca/ui/shell";
import {
  AnnotationCanvas,
  SmartSegmentModelDialog,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { createBrowserSmartSegmentSetup } from "@lisca/smart/segment/browser";
import { useSmartSegment } from "@lisca/smart/segment";
import { stemName, toDisplayFrame } from "@lisca/web-demo/browser";
import { createSignal, Show, type Accessor } from "solid-js";
import type { DemoAnnotatorState } from "@lisca/web-demo";

const browserSmartSegment = createBrowserSmartSegmentSetup();

export function DemoAnnotatorMain(props: {
  state: Accessor<DemoAnnotatorState>;
  embedded?: boolean;
}) {
  const displayFrame = () => {
    const state = props.state();
    return state.frame ? toDisplayFrame(state.frame, state.contrast) : null;
  };
  const visibleStatus = useCanvasTransientStatus(() => props.state().status);
  const [smartSegmentStatus, setSmartSegmentStatus] = createSignal<string | null>(null);
  const [smartSegmentError, setSmartSegmentError] = createSignal<string | null>(null);
  const activeLabelValue = () => {
    const state = props.state();
    return state.labels.findIndex((label) => label.id === state.activeLabelId) + 1;
  };
  const smartSegment = useSmartSegment({
    provider: browserSmartSegment.provider,
    model: browserSmartSegment.model,
    frame: displayFrame,
    tool: () => props.state().tool,
    activeLabelValue,
    mask: () => props.state().annotation.current.mask,
    enabled: () => props.state().canEditSegmentation,
    onCommit: (mask) => {
      const state = props.state();
      state.annotation.commit({
        classificationLabelId: state.annotation.current.classificationLabelId,
        mask,
      });
    },
    onStatus: setSmartSegmentStatus,
    onError: setSmartSegmentError,
  });
  const activeToastStatus = () => {
    const state = props.state();
    return state.frameLoading ? "Loading image" : visibleStatus();
  };
  const toasts = () => {
    if (props.embedded) return [];
    if (smartSegmentError()) {
      return [{ text: smartSegmentError()!, tone: "error" as const }];
    }
    const state = props.state();
    if (state.error) {
      return [{ text: state.error, tone: "error" as const }];
    }
    if (smartSegmentStatus()) {
      return [{ text: smartSegmentStatus()! }];
    }
    const status = activeToastStatus();
    if (status) {
      return [{ text: status }];
    }
    return [];
  };
  const canvas = (
    <AnnotationCanvas
      activeLabelId={props.state().activeLabelId}
      brushSize={props.state().brushSize}
      class={props.embedded ? "min-h-0 flex-1" : "h-full w-full"}
      disabled={!props.state().canEditSegmentation || smartSegment.busy()}
      frame={displayFrame()}
      labels={props.state().labels}
      mask={props.state().annotation.current.mask}
      overlayOpacity={props.state().overlayOpacity}
      smartSegmentPrompts={smartSegment.prompts()}
      toasts={toasts()}
      tool={props.state().tool}
      onMaskCommit={(mask) => {
        const state = props.state();
        state.annotation.commit({
          classificationLabelId: state.annotation.current.classificationLabelId,
          mask,
        });
      }}
      onSmartSegmentClick={(click) => void smartSegment.handleClick(click)}
      onSmartEraseClick={(click) => void smartSegment.handleEraseClick(click)}
    />
  );

  const captionLeft = () => {
    const fileName = props.state().fileName;
    return fileName ? stemName(fileName) : "Demo";
  };
  const captionRight = () => {
    const frame = displayFrame();
    return frame ? `${frame.width} × ${frame.height} px` : "No frame";
  };

  return (
    <Show
      when={props.embedded}
      fallback={
        <ViewportCard>
          <SmartSegmentModelDialog
            busy={smartSegment.busy()}
            state={smartSegment.downloadState()}
            onCancel={smartSegment.cancelDownload}
            onConfirm={() => void smartSegment.confirmDownload()}
          />
          <StageCanvas
            aspect="square"
            captionLeft={captionLeft()}
            captionRight={captionRight()}
            class="max-w-[30rem]"
          >
            {canvas}
          </StageCanvas>
        </ViewportCard>
      }
    >
      <div class="flex h-full min-h-0 flex-1 flex-col p-2.5">
        <Panel class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <SmartSegmentModelDialog
            busy={smartSegment.busy()}
            state={smartSegment.downloadState()}
            onCancel={smartSegment.cancelDownload}
            onConfirm={() => void smartSegment.confirmDownload()}
          />
          {canvas}
        </Panel>
      </div>
    </Show>
  );
}
