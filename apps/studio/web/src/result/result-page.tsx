import { Spinner } from "@lisca/ui/components";
import { AppShell, ViewportCard } from "@lisca/ui/shell";
import { ResultPlotGallery } from "./result-panels-grid";
import { createEffect, createMemo, createSignal } from "solid-js";
import { runClientEffect } from "@lisca/client/runtime";
import { resolveStudioHttpBaseUrl, studioClient, toErrorMessage } from "../api/studio-port";
import { StudioLeft } from "../components/studio-left";
import { StudioRightPanel } from "../components/studio-right-panel";
import { StudioResultExpertRight } from "../components/studio-result-expert-right";
import { StudioResultDock } from "../components/studio-result-dock";
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
import { useStudioResultState } from "../state/use-studio-result-state";

export default function ResultPage() {
  const resultState = useStudioResultState();
  const [activeSection, setActiveSection] = createSignal<ResultPlotSection>("timeseries");
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
  const allPlots = createMemo(() =>
    collectResultPlots(analysisResultFiles(), assayKind()).map((plot) =>
      withPlotSrc(plot, resolveStudioHttpBaseUrl()),
    ),
  );
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
    setActiveSection(section);
  };
  createEffect(() => {
    const plots = allPlots();
    if (plots.length === 0) return;
    const current = filterResultPlotsBySection(plots, activeSection());
    if (current.length > 0) return;
    setActiveSection(defaultResultPlotSection(plots));
  });
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
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ViewportCard class="relative">
              <div class="relative flex h-full min-h-0 flex-1 flex-col">
                <ResultPlotGallery
                  emptyMessage={
                    hasAnyPlots()
                      ? "No plot images in this section."
                      : "Run analysis to see pipeline plot images."
                  }
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
            </ViewportCard>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioResultDock
              saveDisabled={!resultState.workspacePath?.trim() || !hasAnyPlots() || isSaving()}
              saveLabel={isSaving() ? "Saving…" : "Save"}
              shortcutsEnabled={!isSaving()}
              toolActions={sectionToolActions()}
              onSave={() => {
                void savePdf();
              }}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-72">
          <StudioRightPanel
            expert={() => <StudioResultExpertRight />}
            instruction={dockInstruction}
          />
        </AppShell.Right>
      </AppShell.Body>
    </AppShell>
  );
}
