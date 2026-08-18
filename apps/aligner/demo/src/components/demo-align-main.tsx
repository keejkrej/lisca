import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import {
  AlignCanvas,
  useAlignCanvasPointerHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { frameWithContrast, stemName } from "@lisca/web-demo/browser";
import type { DemoAlignState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAlignMain(props: { state: Accessor<DemoAlignState>; embedded?: boolean }) {
  const pointer = useAlignCanvasPointerHandlers(() => {
    const state = props.state();
    return {
      grid: state.grid,
      setGrid: state.setGrid,
      toolMode: state.toolMode,
      spacingZoomLocked: state.spacingZoomLocked,
      patternZoomLocked: state.patternZoomLocked,
      manualExclusionEnabled: state.manualExclusionEnabled,
      excludedCells: state.excludedCells,
      frame: state.frame,
      onExcludedCellsChange: state.setExcludedCells,
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
      excludedCells={props.state().excludedCells}
      frame={displayFrame()}
      grid={props.state().grid}
      toolMode={props.state().toolMode}
      previewGridRef={pointer.previewGridRef}
      previewRedrawRef={pointer.previewRedrawRef}
      toasts={props.embedded ? [] : toasts()}
      onVirtualPointerCancel={pointer.handlePointerCancel}
      onVirtualPointerDown={pointer.handlePointerDown}
      onVirtualPointerMove={pointer.handlePointerMove}
      onVirtualPointerUp={pointer.handlePointerEnd}
    />
  );

  if (props.embedded) {
    return <ViewportCard>{canvas}</ViewportCard>;
  }

  const captionLeft = () => {
    const fileName = props.state().fileName;
    return fileName ? stemName(fileName) : "Demo";
  };
  const captionRight = () => {
    const frame = displayFrame();
    return frame ? `${frame.width} × ${frame.height} px` : "No frame";
  };

  return (
    <ViewportCard variant="stage">
      <StageCanvas
        aspect="wide"
        captionLeft={captionLeft()}
        captionRight={captionRight()}
        class="max-w-[45rem]"
      >
        {canvas}
      </StageCanvas>
    </ViewportCard>
  );
}
