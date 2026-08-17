import { StageCanvas, ViewportCard } from "@lisca/ui/shell";
import {
  AlignCanvas,
  cursorForAlignTool,
  useAlignCanvasGridHandlers,
  useAlignCanvasSelectionHandlers,
  useCanvasTransientStatus,
} from "@lisca/ui/features";
import { frameWithContrast, stemName } from "@lisca/web-demo/browser";
import type { DemoAlignState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAlignMain(props: { state: Accessor<DemoAlignState>; embedded?: boolean }) {
  const previewRedrawRef = { current: null as (() => void) | null };
  const gridHandlers = useAlignCanvasGridHandlers(() => ({
    disabled: false,
    grid: props.state().grid,
    spacingZoomLocked: props.state().spacingZoomLocked,
    patternZoomLocked: props.state().patternZoomLocked,
    setGrid: props.state().setGrid,
    toolMode: props.state().toolMode,
    onPreviewGridChange: () => previewRedrawRef.current?.(),
  }));
  const selectionHandlers = useAlignCanvasSelectionHandlers(() => ({
    enabled: props.state().manualExclusionEnabled,
    excludedCells: props.state().excludedCells,
    frame: props.state().frame,
    grid: props.state().grid,
    onExcludedCellsChange: props.state().setExcludedCells,
  }));
  const handlePointerDown: typeof gridHandlers.handlePointerDown = (event) => {
    if (props.state().manualExclusionEnabled) {
      selectionHandlers.handlePointerDown(event);
      return;
    }
    if (selectionHandlers.handlePointerDown(event)) return;
    gridHandlers.handlePointerDown(event);
  };
  const handlePointerMove: typeof gridHandlers.handlePointerMove = (event) => {
    if (selectionHandlers.handlePointerMove(event)) return;
    gridHandlers.handlePointerMove(event);
  };
  const handlePointerEnd: typeof gridHandlers.handlePointerEnd = (event) => {
    if (selectionHandlers.handlePointerEnd(event)) return;
    gridHandlers.handlePointerEnd(event);
  };
  const handlePointerCancel: typeof gridHandlers.handlePointerCancel = (event) => {
    if (selectionHandlers.handlePointerCancel(event)) return;
    gridHandlers.handlePointerCancel(event);
  };
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
  const cursor = () =>
    props.state().toolMode === "magnifier"
      ? "zoom-in"
      : props.state().manualExclusionEnabled || selectionHandlers.selecting()
        ? "crosshair"
        : cursorForAlignTool(
            props.state().toolMode,
            props.state().grid.enabled,
            gridHandlers.dragging(),
          );
  const canvas = (
    <AlignCanvas
      class={props.embedded ? "min-h-0 flex-1" : "h-full w-full"}
      cursor={cursor()}
      excludedCells={props.state().excludedCells}
      frame={displayFrame()}
      grid={props.state().grid}
      toolMode={props.state().toolMode}
      previewGridRef={gridHandlers.previewGridRef}
      previewRedrawRef={previewRedrawRef}
      toasts={props.embedded ? [] : toasts()}
      onVirtualPointerCancel={handlePointerCancel}
      onVirtualPointerDown={handlePointerDown}
      onVirtualPointerMove={handlePointerMove}
      onVirtualPointerUp={handlePointerEnd}
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
