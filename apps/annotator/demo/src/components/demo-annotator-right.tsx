import { AnnotationControlRail } from "@lisca/ui/features";
import type { Accessor } from "solid-js";

import type { DemoAnnotatorState } from "@lisca/web-demo";

export function DemoAnnotatorRight(props: { state: Accessor<DemoAnnotatorState> }) {
  const state = () => props.state();

  return (
    <AnnotationControlRail
      activeLabelId={state().activeLabelId}
      annotation={state().annotation}
      annotationError={state().error}
      brushSize={state().brushSize}
      canEdit={state().canEdit}
      frame={state().frame}
      frameLoading={state().frameLoading}
      labels={state().labels}
      mode={state().mode}
      openLabelDialog={() => {
        state().setLabelError(null);
        state().setLabelDialogOpen(true);
      }}
      overlayOpacity={state().overlayOpacity}
      sectionAppearance="rail"
      setActiveLabelId={state().setActiveLabelId}
      setBrushSize={state().setBrushSize}
      setMode={state().setMode}
      setOverlayOpacity={state().setOverlayOpacity}
      workspacePath={state().fileName ?? "demo"}
    />
  );
}
