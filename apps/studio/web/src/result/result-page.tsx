import { Button, Spinner } from "@lisca/ui/components";
import { AppShell } from "@lisca/ui/shell";
import { ResultPlotGallery } from "./result-panels-grid";
import { createMemo, createResource, createSignal } from "solid-js";
import { liscaDesktopBridge, resolveLiscaAssetUrl } from "@lisca/client/desktop";
import { runClientEffect } from "@lisca/client/runtime";
import { resolveStudioHttpBaseUrl, studioClient, toErrorMessage } from "../api/studio-port";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioResultExpertRight } from "../components/studio-result-expert-right";
import { StudioResultControls } from "../components/studio-result-dock";
import { StudioTopBar } from "../components/studio-top-bar";
import {
  collectResultPlots,
  defaultResultPlotSection,
  filterResultPlotsBySection,
  inferResultAssayKind,
  resultSectionInstruction,
  resultSectionLabel,
  withPlotSrc,
  type ResultPlot,
  type ResultPlotSection,
} from "@lisca/analysis";
import { useStudioNavigate } from "../navigation/use-studio-navigate";
import { useStudioResultState } from "../state/use-studio-result-state";

export default function ResultPage() {
  const { navigateTo } = useStudioNavigate();
  const resultState = useStudioResultState();
  const [selectedSection, setSelectedSection] = createSignal<ResultPlotSection>("timeseries");
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal<string | null>(null);
  const [exportCapture, setExportCapture] = createSignal<{
    timeseriesPlots: ResultPlot[];
    parameterPlots: ResultPlot[];
  } | null>(null);
  let exportTimeseriesEl: HTMLDivElement | undefined;
  let exportParametersEl: HTMLDivElement | undefined;
  const analysisResultFiles = () => resultState.analysisResultFiles;
  const assayKind = createMemo(() => inferResultAssayKind(analysisResultFiles()));
  const isDesktop = liscaDesktopBridge() !== null;
  const plotsWithUrls = createMemo(() =>
    collectResultPlots(analysisResultFiles(), assayKind()).map((plot) =>
      withPlotSrc(plot, resolveStudioHttpBaseUrl()),
    ),
  );
  const [desktopPlots] = createResource(
    () => (isDesktop ? plotsWithUrls() : null),
    async (plots) =>
      Promise.all(
        plots.map(async (plot) =>
          plot.src?.startsWith("http")
            ? { ...plot, src: await resolveLiscaAssetUrl(plot.src) }
            : plot,
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
  const timeseriesPlots = createMemo(() => filterResultPlotsBySection(allPlots(), "timeseries"));
  const parameterPlots = createMemo(() => filterResultPlotsBySection(allPlots(), "parameters"));
  const hasAnyPlots = createMemo(() => allPlots().length > 0);
  const savePdf = async () => {
    if (!resultState.workspacePath?.trim() || isSaving() || !hasAnyPlots()) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const { buildResultPdf, pdfBytesToBase64, RESULT_PDF_FILE_NAME, waitForExportPlots } =
        await import("./save-result-pdf");
      const timeseries = timeseriesPlots();
      const parameters = parameterPlots();
      setExportCapture({
        timeseriesPlots: timeseries,
        parameterPlots: parameters,
      });
      await Promise.resolve();
      const timeseriesPage = exportTimeseriesEl;
      const parametersPage = exportParametersEl;
      if (!timeseriesPage && !parametersPage) {
        throw new Error("Nothing to export");
      }
      const pages: HTMLElement[] = [];
      const expectedPlots = timeseries.length + parameters.length;
      if (timeseriesPage && timeseries.length > 0) {
        await waitForExportPlots(timeseriesPage, timeseries.length);
        pages.push(timeseriesPage);
      }
      if (parametersPage && parameters.length > 0) {
        await waitForExportPlots(parametersPage, parameters.length);
        pages.push(parametersPage);
      }
      if (pages.length === 0) {
        throw new Error("No plots to export");
      }
      const pdfBytes = await buildResultPdf(pages);
      const response = await runClientEffect(
        studioClient.saveResultPdf({
          workspacePath: resultState.workspacePath!,
          fileName: RESULT_PDF_FILE_NAME,
          contentsBase64: pdfBytesToBase64(pdfBytes),
        }),
      );
      setSaveMessage(`Saved PDF (${expectedPlots} plot(s)) to ${response.path}`);
    } catch (cause) {
      setSaveMessage(toErrorMessage(cause, "Failed to save PDF"));
    } finally {
      setExportCapture(null);
      setIsSaving(false);
    }
  };
  const switchSection = (section: ResultPlotSection) => {
    if (section === activeSection() || isSaving()) return;
    setSelectedSection(section);
  };
  const defaultInstruction = () => resultSectionInstruction(activeSection(), assayKind());
  const dockInstruction = () => saveMessage() ?? defaultInstruction();
  const sectionToolActions = createMemo(() => [
    {
      id: "timeseries",
      label: resultSectionLabel("timeseries", assayKind()),
      disabled: timeseriesPlots().length === 0 || isSaving(),
      active: activeSection() === "timeseries",
      onSelect: () => switchSection("timeseries"),
    },
    {
      id: "parameters",
      label: resultSectionLabel("parameters", assayKind()),
      disabled: parameterPlots().length === 0 || isSaving(),
      active: activeSection() === "parameters",
      onSelect: () => switchSection("parameters"),
    },
  ]);
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-64">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.TopBar>
            <StudioTopBar showExpert />
          </AppShell.TopBar>
          <AppShell.Main>
            <AppShell.MainScroll contentClass="relative max-w-[840px] px-6 py-8">
              <div class="relative flex min-h-full w-full flex-1 flex-col">
                <ResultPlotGallery
                  emptyTitle={
                    !resultState.workspacePath?.trim()
                      ? "No workspace yet"
                      : hasAnyPlots()
                        ? "Nothing in this view"
                        : "No plots yet"
                  }
                  emptyMessage={
                    !resultState.workspacePath?.trim()
                      ? "Choose a workspace on the Info step, then run analysis from Annotate. Plots show up here as images."
                      : hasAnyPlots()
                        ? "Switch views in the dock, or run analysis again."
                        : "On Annotate, press Continue to analysis. Finished plots appear here as images."
                  }
                  emptyAction={
                    hasAnyPlots() ? undefined : (
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          navigateTo(resultState.workspacePath?.trim() ? "/annotate" : "/info")
                        }
                      >
                        {resultState.workspacePath?.trim() ? "Go to Annotate" : "Go to Info"}
                      </Button>
                    )
                  }
                  pageTitle={resultSectionLabel(activeSection(), assayKind())}
                  plots={sectionPlots()}
                  section={activeSection()}
                />
                {exportCapture() ? (
                  <div
                    aria-hidden
                    class="pointer-events-none fixed top-0 -left-[10000px] w-[1200px] bg-white"
                  >
                    {exportCapture()!.timeseriesPlots.length > 0 ? (
                      <div ref={exportTimeseriesEl!}>
                        <ResultPlotGallery
                          exportMode
                          pageTitle="Timeseries"
                          plots={exportCapture()!.timeseriesPlots}
                          section="timeseries"
                        />
                      </div>
                    ) : null}
                    {exportCapture()!.parameterPlots.length > 0 ? (
                      <div ref={exportParametersEl!}>
                        <ResultPlotGallery
                          exportMode
                          pageTitle="Parameters"
                          plots={exportCapture()!.parameterPlots}
                          section="parameters"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {isSaving() ? (
                  <div class="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                    <Spinner class="size-4" />
                  </div>
                ) : null}
              </div>
            </AppShell.MainScroll>
          </AppShell.Main>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-64">
          <StudioRightPanel
            expert={() => (
              <>
                <StudioResultExpertRight />
                <StudioResultControls
                  saveDisabled={!resultState.workspacePath?.trim() || !hasAnyPlots() || isSaving()}
                  saveLabel={isSaving() ? "Saving PDF…" : "Save PDF"}
                  shortcutsEnabled={!isSaving()}
                  toolActions={hasAnyPlots() ? sectionToolActions() : []}
                  onSave={() => void savePdf()}
                />
              </>
            )}
            instruction={dockInstruction}
          >
            <StudioResultControls
              saveDisabled={!resultState.workspacePath?.trim() || !hasAnyPlots() || isSaving()}
              saveLabel={isSaving() ? "Saving PDF…" : "Save PDF"}
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
