import { AlignDriftRail, AlignGridRail } from "@lisca/instrument";
import { PanelSection, RailSidebar } from "@lisca/ui/patterns";
import { isAlignDriftTranslationEditable } from "@lisca/utils";

import { useAlignCanvas } from "../state/align-page-selectors";
import { AlignSelectionControls } from "./align-selection-controls";
import { AlignSaveSection } from "./align-save-section";

export function AlignerRight() {
  const canvas = useAlignCanvas();

  return (
    <RailSidebar>
      <PanelSection appearance="rail" title="Instruction">
        <p class="text-xs leading-relaxed text-muted-foreground">
          Align the grid to micropatterns, exclude damaged wells, and save each position.
        </p>
      </PanelSection>
      <AlignGridRail
        detectLowConfidence={canvas.detectLowConfidence}
        detectReport={canvas.detectReport}
        detecting={canvas.detecting}
        disabled={!canvas.frame || canvas.detecting}
        grid={canvas.grid}
        sectionAppearance="rail"
        shownTranslation={{ tx: canvas.effectiveGrid.tx, ty: canvas.effectiveGrid.ty }}
        translationEditable={isAlignDriftTranslationEditable(canvas.drift, canvas.selection.time)}
        onDetectGrid={(shape) => void canvas.detectGrid(shape)}
        onGridChange={canvas.setGrid}
        onTranslationDelta={canvas.adjustTranslation}
      />
      <AlignDriftRail
        assayDefaultTime={canvas.assayDefaultTime}
        disabled={!canvas.frame}
        drift={canvas.drift}
        frame={canvas.frame}
        time={canvas.selection.time}
        times={canvas.scan?.times}
        onClearDrift={canvas.clearDrift}
        onDeltaChange={canvas.setDriftDelta}
        onClearKeyframe={canvas.clearKeyframe}
        onSetKeyframe={canvas.setKeyframe}
        onSetReference={canvas.setReference}
      />
      <AlignSelectionControls />
      <AlignSaveSection />
    </RailSidebar>
  );
}
