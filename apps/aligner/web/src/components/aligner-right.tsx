import { AlignDriftRail, AlignGridRail } from "@lisca/ui/features";
import { RailSidebar } from "@lisca/ui/shell";
import { isAlignDriftTranslationEditable } from "@lisca/utils";

import { useAlignCanvas } from "../state/align-page-selectors";
import { AlignSelectionControls } from "./align-selection-controls";
import { AlignSaveSection } from "./align-save-section";

export function AlignerRight() {
  const canvas = useAlignCanvas();

  return (
    <RailSidebar>
      <AlignGridRail
        disabled={!canvas.frame}
        grid={canvas.grid}
        sectionAppearance="rail"
        shownTranslation={{ tx: canvas.effectiveGrid.tx, ty: canvas.effectiveGrid.ty }}
        translationEditable={isAlignDriftTranslationEditable(canvas.drift, canvas.selection.time)}
        onGridChange={canvas.setGrid}
        onTranslationDelta={canvas.adjustTranslation}
      />
      <AlignDriftRail
        assayDefaultTime={canvas.assayDefaultTime}
        disabled={!canvas.frame}
        drift={canvas.drift}
        frame={canvas.frame}
        time={canvas.selection.time}
        timeLabels={canvas.scan?.timeLabels}
        times={canvas.scan?.times}
        onClearDrift={canvas.clearDrift}
        onClearKeyframe={canvas.clearKeyframe}
        onSetKeyframe={canvas.setKeyframe}
        onSetReference={canvas.setReference}
      />
      <AlignSelectionControls />
      <AlignSaveSection />
    </RailSidebar>
  );
}
