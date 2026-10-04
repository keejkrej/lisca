import { Panel, StageCanvas, ViewportCard } from "@lisca/ui/shell";
import {
  AlignCanvas,
  applyAlignGridReferenceCommit,
  CanvasToastStack,
  useAlignCanvasPointerHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { frameWithContrast, stemName } from "@lisca/web-demo/browser";
import type { DemoAlignState } from "@lisca/web-demo";
import { Show, type Accessor } from "solid-js";

export function DemoAlignMain(props: { state: Accessor<DemoAlignState>; embedded?: boolean }) {
  const pointer = useAlignCanvasPointerHandlers(() => {
    const state = props.state();
    return {
      grid: state.grid,
      onCommit: (preview, intent, startGrid) => {
        const current = props.state();
        current.setGrid(applyAlignGridReferenceCommit(current.grid, preview, intent, startGrid));
      },
      toolMode: state.toolMode,
      spacingZoomLocked: state.spacingZoomLocked,
      patternZoomLocked: state.patternZoomLocked,
      manualExclusionEnabled: state.manualExclusionEnabled,
      excludedPatterns: state.excludedPatterns,
      frame: state.frame,
      onExcludedPatternsChange: state.setExcludedPatterns,
    };
  });
  const displayFrame = () => {
    const state = props.state();
    return state.frame ? frameWithContrast(state.frame, state.contrast) : null;
  };
  const visibleStatus = useCanvasTransientStatus(() => props.state().status);
  const activeToastStatus = () => (props.state().frameLoading ? "Loading image" : visibleStatus());
  const toasts = () => {
    const error = props.state().error;
    if (error) {
      return [
        {
          text: error,
          tone: "error" as const,
        },
      ];
    }
    const status = activeToastStatus();
    if (status)
      return [
        {
          text: status,
        },
      ];
    return [];
  };
  const canvas = (
    <AlignCanvas
      class={props.embedded ? "min-h-0 flex-1" : "h-full w-full"}
      cursor={pointer.cursor()}
      excludedPatterns={props.state().excludedPatterns}
      frame={displayFrame()}
      grid={props.state().grid}
      toolMode={props.state().toolMode}
      previewGridRef={pointer.previewGridRef}
      previewRedrawRef={pointer.previewRedrawRef}
      onVirtualPointerCancel={pointer.handlePointerCancel}
      onVirtualPointerDown={pointer.handlePointerDown}
      onVirtualPointerMove={pointer.handlePointerMove}
      onVirtualPointerUp={pointer.handlePointerEnd}
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
          <StageCanvas
            notice={<CanvasToastStack messages={toasts()} />}
            captionLeft={captionLeft()}
            captionRight={captionRight()}
          >
            {canvas}
          </StageCanvas>
        </ViewportCard>
      }
    >
      <div class="flex h-full min-h-0 flex-1 flex-col p-2.5">
        <Panel class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{canvas}</Panel>
      </div>
    </Show>
  );
}
