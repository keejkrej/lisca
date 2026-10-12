import { Button } from "@lisca/ui/primitives";
import { CanvasToastStack, useCanvasTransientStatus } from "@lisca/instrument";
import { AppShell } from "@lisca/ui/shell";
import { AnalysisPlotGallery } from "./analysis-plot-gallery";
import { createMemo, createResource, createSignal } from "solid-js";
import {
  liscaDesktopBridge,
  loadLiscaAssetBytes,
  resolveLiscaAssetUrl,
  saveLiscaFile,
} from "@lisca/client/desktop";
import { toErrorMessage } from "../api/studio-port";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioAnalysisExpert } from "../components/studio-analysis-expert";
import { StudioAnalysisControls } from "../components/studio-analysis-controls";
import { StudioTopBar } from "../components/studio-top-bar";
import {
  collectResultPlots,
  defaultResultPlotSection,
  filterResultPlotsBySection,
  groupResultPlots,
  inferResultAssayKind,
  resultGridColumns,
  resultSectionInstruction,
  resultSectionLabel,
  visibleResultPlotSections,
  withPlotSrc,
  type ResultAssayKind,
  type ResultPlotSection,
} from "@lisca/analysis";
import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { useStudioAnalysisPage } from "../state/use-studio-analysis-page";
import { useStudioStore } from "../state/studio-store";

export default function AnalysisPage() {
  const { navigateTo } = useStudioNavigate();
  const analysisPage = useStudioAnalysisPage();
  const [selectedSection, setSelectedSection] = createSignal<ResultPlotSection>("traces");
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal<string | null>(null);
  const analysisResultFiles = () => analysisPage.analysisResultFiles;
  const assayId = useStudioStore((state) => state.assayId);
  const assayKind = createMemo((): ResultAssayKind => {
    const id = assayId();
    if (id === "killing-death-reporter" || id === "transfection" || id === "killing-engagement")
      return id;
    return inferResultAssayKind(analysisResultFiles());
  });
  const isDesktop = liscaDesktopBridge() !== null;
  const plotsWithUrls = createMemo(() =>
    collectResultPlots(analysisResultFiles(), assayKind()).map(withPlotSrc),
  );
  const [desktopPlots] = createResource(
    () => (isDesktop ? plotsWithUrls() : null),
    async (plots) =>
      Promise.all(
        plots.map(async (plot) =>
          // Server file URLs are origin-relative; fixtures may already carry data URLs.
          plot.src?.startsWith("/") ? { ...plot, src: await resolveLiscaAssetUrl(plot.src) } : plot,
        ),
      ),
  );
  const allPlots = () => (isDesktop ? (desktopPlots() ?? []) : plotsWithUrls());
  const activeSection = createMemo(() => {
    const plots = allPlots();
    const selected = selectedSection();
    return plots.length === 0 || filterResultPlotsBySection(plots, selected).length > 0
      ? selected
      : defaultResultPlotSection(plots);
  });
  const sectionPlots = createMemo(() => filterResultPlotsBySection(allPlots(), activeSection()));
  const visibleSections = createMemo(() => visibleResultPlotSections(allPlots()));
  const hasAnyPlots = createMemo(() => allPlots().length > 0);
  const savePdf = async () => {
    const workspacePath = analysisPage.workspacePath?.trim();
    if (!workspacePath || isSaving() || !hasAnyPlots()) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const { buildResultPdf, RESULT_PDF_FILE_NAME } = await import("./save-result-pdf");
      // Read PNG bytes from the backend URLs, not the desktop data URLs shown in the gallery.
      const loadSection = async (section: ResultPlotSection) => ({
        title: resultSectionLabel(section),
        groups: await Promise.all(
          groupResultPlots(filterResultPlotsBySection(plotsWithUrls(), section)).map(
            async (group) => ({
              title: group.title,
              columns: resultGridColumns(group.plots.length, group.layout),
              plots: await Promise.all(
                group.plots.flatMap((plot, index) =>
                  plot.src
                    ? [
                        loadLiscaAssetBytes(plot.src).then((bytes) => ({
                          label: group.labels[index]!,
                          bytes,
                        })),
                      ]
                    : [],
                ),
              ),
            }),
          ),
        ),
      });
      const sections: Awaited<ReturnType<typeof loadSection>>[] = [];
      for (const section of visibleResultPlotSections(plotsWithUrls())) {
        sections.push(await loadSection(section));
      }
      const savedTo = await saveLiscaFile({
        fileName: RESULT_PDF_FILE_NAME,
        directory: `${workspacePath.replace(/[\\/]+$/, "")}/results`,
        mimeType: "application/pdf",
        filterName: "PDF",
        extensions: ["pdf"],
        bytes: await buildResultPdf(sections),
      });
      if (savedTo) {
        const plotCount = sections
          .flatMap((section) => section.groups)
          .reduce((sum, group) => sum + group.plots.length, 0);
        setSaveMessage(`Saved PDF (${plotCount} plot(s)) to ${savedTo}`);
      }
    } catch (cause) {
      setSaveMessage(toErrorMessage(cause, "Failed to save PDF"));
    } finally {
      setIsSaving(false);
    }
  };
  const switchSection = (section: ResultPlotSection) => {
    if (section === activeSection() || isSaving()) return;
    setSelectedSection(section);
  };
  const visibleSaveMessage = useCanvasTransientStatus(saveMessage);
  const saveToast = createMemo(() => {
    const text = visibleSaveMessage();
    if (!text) return [];
    return [
      {
        text,
        tone: text.startsWith("Failed") ? ("error" as const) : undefined,
      },
    ];
  });
  const defaultInstruction = () => resultSectionInstruction(activeSection(), assayKind());
  const sectionToolActions = createMemo(() =>
    visibleSections().map((section) => ({
      id: section,
      label: resultSectionLabel(section),
      disabled: isSaving(),
      active: activeSection() === section,
      onSelect: () => switchSection(section),
    })),
  );
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-rail">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar showExpert />
          </AppShell.TopBar>
          <AppShell.Main>
            <CanvasToastStack messages={saveToast()} />
            <AppShell.MainScroll contentClass="relative max-w-[1200px] px-6 py-8">
              <div class="relative flex min-h-full w-full flex-1 flex-col">
                <AnalysisPlotGallery
                  emptyTitle={
                    !analysisPage.workspacePath?.trim()
                      ? "No workspace yet"
                      : hasAnyPlots()
                        ? "Nothing in this view"
                        : "No plots yet"
                  }
                  emptyMessage={
                    !analysisPage.workspacePath?.trim()
                      ? "Choose a workspace on the Metadata step, then run analysis from Annotate. Plots show up here as images."
                      : hasAnyPlots()
                        ? "Switch views in the dock, or run analysis again."
                        : "On Annotate, press Analyze. Finished plots appear here as images."
                  }
                  emptyAction={
                    hasAnyPlots() ? undefined : (
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          navigateTo(analysisPage.workspacePath?.trim() ? "/annotate" : "/metadata")
                        }
                      >
                        {analysisPage.workspacePath?.trim() ? "Go to Annotate" : "Go to Metadata"}
                      </Button>
                    )
                  }
                  pageTitle={resultSectionLabel(activeSection())}
                  plots={sectionPlots()}
                  section={activeSection()}
                />
              </div>
            </AppShell.MainScroll>
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-rail">
          <StudioRightPanel
            expert={() => (
              <>
                <StudioAnalysisExpert />
                <StudioAnalysisControls
                  saveDisabled={!analysisPage.workspacePath?.trim() || !hasAnyPlots() || isSaving()}
                  saveLabel="Save PDF"
                  shortcutsEnabled={!isSaving()}
                  toolActions={hasAnyPlots() ? sectionToolActions() : []}
                  onSave={() => void savePdf()}
                />
              </>
            )}
            instruction={defaultInstruction}
          >
            <StudioAnalysisControls
              saveDisabled={!analysisPage.workspacePath?.trim() || !hasAnyPlots() || isSaving()}
              saveLabel="Save PDF"
              shortcutsEnabled={!isSaving()}
              toolActions={hasAnyPlots() ? sectionToolActions() : []}
              onSave={() => void savePdf()}
            />
          </StudioRightPanel>
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
