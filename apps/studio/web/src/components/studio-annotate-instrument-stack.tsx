import {
  AnnotationControlRail,
  AnnotationToolGrid,
  buildAnnotationToolActions,
} from "@lisca/ui/features";
import { useAtomValue } from "@effect/atom-solid";
import { Button } from "@lisca/ui/components";
import { PanelSection, RailControlStack } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { studioExpertModeAtom } from "../atoms/studio-expert-atoms";
import {
  CommandShortcutHint,
  commandShortcutKeys,
  useStudioCommandShortcut,
} from "../navigation/use-studio-command-shortcut";
import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";
import {
  useStudioAnnotateCanvas,
  useStudioAnnotateDock,
  useStudioAnnotateLabels,
} from "../state/studio-annotate-page-selectors";
import { StudioAnnotateNav } from "./studio-annotate-nav";

/**
 * Shared Studio Annotate instrument stack for basic and expert modes.
 * Expert sections stack above the normal rail: Navigation → Contrast,
 * then Mode → Tool → Labels → Edit → Brush → Action.
 * Action follows the rail vocabulary: Save → Back → Next → Analyze (primary, last).
 */
export function StudioAnnotateInstrumentStack() {
  const { state } = useStudioAnnotatePage();
  const expertMode = useAtomValue(() => studioExpertModeAtom);

  return (
    <Show
      when={!state.workspaceMissing}
      fallback={
        <PanelSection appearance="rail" title="Annotate">
          <p class="text-[13px] leading-[18px] text-muted-foreground">
            Choose a workspace on the Metadata step first.
          </p>
        </PanelSection>
      }
    >
      <>
        <Show when={!expertMode()}>
          <StudioAnnotateNav frameOnly />
        </Show>
        <Show when={expertMode()}>
          <StudioAnnotateNav />
        </Show>
        <StudioAnnotateControlSections />
        <StudioAnnotateActionSection />
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
      insertAfterMode={<StudioAnnotateToolSection />}
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

function StudioAnnotateActionSection() {
  const dock = useStudioAnnotateDock();
  useStudioCommandShortcut(
    "save",
    () => dock.canSave && !dock.saving,
    () => void dock.handleSave(),
  );
  useStudioCommandShortcut(
    "back",
    () => dock.canGoToPreviousSite,
    () => dock.goToPreviousSite(),
  );
  useStudioCommandShortcut(
    "next",
    () => dock.canGoToNextSite,
    () => dock.goToNextSite(),
  );
  const disableContinue = () =>
    dock.frameLoading || !dock.request || dock.analysisBusy || dock.workspaceMissing;
  useStudioCommandShortcut(
    "analyze",
    () => !disableContinue(),
    () => dock.requestContinueToAnalysis(),
  );

  return (
    <PanelSection appearance="rail" title="Action">
      <RailControlStack>
        <Button
          aria-keyshortcuts={commandShortcutKeys("save")}
          class="relative w-full justify-center"
          disabled={!dock.canSave}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => void dock.handleSave()}
        >
          Save
          <CommandShortcutHint command="save" />
        </Button>
        <Button
          aria-keyshortcuts={commandShortcutKeys("back")}
          class="relative w-full justify-center"
          data-rail-nav
          disabled={!dock.canGoToPreviousSite}
          size="sm"
          type="button"
          variant="outline"
          onClick={dock.goToPreviousSite}
        >
          Back
          <CommandShortcutHint command="back" />
        </Button>
        <Button
          aria-keyshortcuts={commandShortcutKeys("next")}
          class="relative w-full justify-center"
          data-rail-nav
          disabled={!dock.canGoToNextSite}
          size="sm"
          type="button"
          variant="outline"
          onClick={dock.goToNextSite}
        >
          Next
          <CommandShortcutHint command="next" />
        </Button>
        <Button
          aria-keyshortcuts={commandShortcutKeys("analyze")}
          class="relative w-full justify-center"
          size="sm"
          type="button"
          onClick={dock.requestContinueToAnalysis}
          disabled={disableContinue()}
        >
          Analyze
          <CommandShortcutHint command="analyze" />
        </Button>
      </RailControlStack>
    </PanelSection>
  );
}
