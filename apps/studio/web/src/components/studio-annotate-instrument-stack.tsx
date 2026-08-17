import {
  AnnotationControlRail,
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import {
  useStudioAnnotateCanvas,
  useStudioAnnotateDock,
  useStudioAnnotateLabels,
} from "../state/studio-annotate-page-selectors";
import { StudioAnnotateNav } from "./studio-annotate-nav";

/**
 * Shared Studio Annotate instrument stack for basic and expert modes.
 * Flattened order (after Instruction): Navigation → Contrast → Tool → Mode → Labels → Edit → Brush → Action.
 * Expert may add Shuffle in Action; Nav/Contrast/Tool stay in both modes.
 */
export function StudioAnnotateInstrumentStack(props: { showShuffle?: boolean }) {
  const { state } = useStudioAnnotatePage();

  return (
    <Show
      when={!state.workspaceMissing}
      fallback={
        <PanelSection appearance="rail" title="Annotate">
          <p class="text-[13px] leading-[18px] text-muted-foreground">
            Choose a workspace on the Info step first.
          </p>
        </PanelSection>
      }
    >
      <>
        <StudioAnnotateNav />
        <StudioAnnotateToolSection />
        <StudioAnnotateControlSections />
        <StudioAnnotateActionSection showShuffle={props.showShuffle ?? false} />
      </>
    </Show>
  );
}

function StudioAnnotateToolSection() {
  const dock = useStudioAnnotateDock();
  const canvas = useStudioAnnotateCanvas();
  const canEditTools = () => dock.mode === "segmentation" && dock.shortcutsEnabled;
  const toolActions = () =>
    buildAnnotationToolActions(dock.tool, dock.setTool, !canEditTools(), {
      viewable: Boolean(canvas.frame),
    });

  return (
    <Show when={dock.mode === "segmentation"}>
      <PanelSection appearance="rail" title="Tool">
        <AnnotationToolGrid
          canEditTools={canEditTools()}
          layout="rail"
          shortcutsEnabled={dock.shortcutsEnabled}
          toolActions={toolActions()}
        />
      </PanelSection>
    </Show>
  );
}

function StudioAnnotateControlSections() {
  const labels = useStudioAnnotateLabels();

  return (
    <AnnotationControlRail
      activeLabelId={labels.activeLabelId}
      annotation={labels.annotation}
      annotationError={labels.annotationError}
      annotationLoading={labels.annotationLoading}
      brushSize={labels.brushSize}
      canEdit={labels.canEdit}
      frame={labels.frame}
      frameError={labels.frameError}
      frameLoading={labels.frameLoading}
      labels={labels.labels}
      mode={labels.mode}
      openLabelDialog={labels.openLabelDialog}
      overlayOpacity={labels.overlayOpacity}
      saveError={labels.saveError}
      scanError={labels.scanError}
      scanLoading={labels.scanLoading}
      sectionAppearance="rail"
      setActiveLabelId={labels.setActiveLabelId}
      setBrushSize={labels.setBrushSize}
      setMode={labels.setMode}
      setOverlayOpacity={labels.setOverlayOpacity}
      workspacePath={labels.workspacePath}
    />
  );
}

function StudioAnnotateActionSection(props: { showShuffle: boolean }) {
  const dock = useStudioAnnotateDock();
  const disableShuffle = () => dock.scanLoading || dock.scan === null || dock.workspaceMissing;
  const disableContinue = () =>
    dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          class="w-full justify-center rounded-full"
          disabled={!dock.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void dock.handleSave()}
        >
          {dock.saving ? "Saving…" : "Save"}
        </Button>
        <Button
          class="w-full justify-center rounded-full"
          disabled={!dock.canGoToNextSite}
          size="sm"
          type="button"
          variant="outline"
          onClick={dock.goToNextSite}
        >
          Next site
        </Button>
        <Show when={props.showShuffle}>
          <Button
            class="w-full justify-center rounded-full"
            disabled={disableShuffle()}
            size="sm"
            type="button"
            variant="outline"
            onClick={dock.shuffleSelection}
          >
            Shuffle
          </Button>
        </Show>
        <Button
          class="w-full justify-center rounded-full"
          size="sm"
          type="button"
          onClick={dock.requestContinueToAnalysis}
          disabled={disableContinue()}
        >
          Continue to analysis
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}
