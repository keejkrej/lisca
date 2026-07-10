import type { StudioAnalysisCsvFile } from "@lisca/contracts";
import { resultData } from "@lisca/client/atoms";
import { RegistryContext, useAtomSet } from "@effect-atom/atom-solid";
import { Spinner } from "@lisca/ui/components";
import { AppShell, ViewportCard } from "@lisca/ui/shell";
import { ResultPanelsGridView } from "@lisca/ui/features";
import { countChartSpecs } from "@lisca/analysis/charts";
import { createEffect, createMemo, createSignal, onCleanup, useContext } from "solid-js";
import { runClientEffect } from "@lisca/client/runtime";
import { studioClient, toErrorMessage } from "../api/studio-port";
import {
  analysisPanelsAtom,
  analysisPanelsParamsKey,
  loadAnalysisPanelsAtom,
  slideChannelLabelsCacheKey,
} from "../atoms/studio-analysis-atoms";
import { StudioLeft } from "../components/studio-left";
import { StudioResultDock } from "../components/studio-result-dock";
import {
  collectDisplayedParameterPanels,
  collectTimeseriesPanels,
  defaultResultPlotSection,
  filterResultFilesBySection,
  intervalFromAssaySettings,
  type ResultPanel,
  type ResultPlotSection,
  type SlideChannelLabels,
} from "@lisca/analysis";
import { useStudioResultState } from "../state/use-studio-result-state";
import { useStudioStore } from "../state/studio-store";

export default function ResultPage() {
  const registry = useContext(RegistryContext);
  const resultState = useStudioResultState();
  const info3 = useStudioStore((state) => state.info3);
  const timelapseAmount = useStudioStore((state) => state.info2.timelapseAmount);
  const timelapseUnit = useStudioStore((state) => state.info2.timelapseUnit);
  const activeWorkspacePath = () => resultState.workspacePath?.trim() || null;
  const timeseriesXScale = createMemo(() =>
    intervalFromAssaySettings(timelapseAmount(), timelapseUnit()),
  );
  const slideChannelLabels = createMemo(() => {
    const labels: SlideChannelLabels = {};
    const currentInfo3 = info3();
    for (const row of currentInfo3.samplesBySlide[currentInfo3.selectedSlideId]) {
      const channel = Number(row.channel);
      if (Number.isInteger(channel) && row.name.trim()) {
        labels[channel] = row.name.trim();
      }
    }
    return labels;
  });
  const slideChannelLabelsKey = createMemo(() => slideChannelLabelsCacheKey(slideChannelLabels()));
  const [activeSection, setActiveSection] = createSignal<ResultPlotSection>("timeseries");
  const [isSectionLoading, setIsSectionLoading] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveMessage, setSaveMessage] = createSignal<string | null>(null);
  const [panelError, setPanelError] = createSignal<string | null>(null);
  const [sectionPanels, setSectionPanels] = createSignal<ResultPanel[]>([]);
  const [exportCapture, setExportCapture] = createSignal<{
    timeseriesPanels: ResultPanel[];
    parameterPanels: ResultPanel[];
  } | null>(null);
  let exportTimeseriesEl: HTMLDivElement | undefined;
  let exportParametersEl: HTMLDivElement | undefined;
  const analysisResultFiles = () => resultState.analysisResultFiles;
  const sectionFiles = createMemo(() =>
    filterResultFilesBySection(analysisResultFiles(), activeSection()),
  );
  const sectionFilePathsKey = createMemo(() =>
    sectionFiles().map((file) => file.path).join("\0"),
  );
  const hasTimeseriesFiles = createMemo(
    () => filterResultFilesBySection(analysisResultFiles(), "timeseries").length > 0,
  );
  const hasParameterFiles = createMemo(
    () => filterResultFilesBySection(analysisResultFiles(), "parameters").length > 0,
  );
  const panelsParams = (file: StudioAnalysisCsvFile) => ({
    workspacePath: activeWorkspacePath() ?? "",
    file,
    timeseriesXScale: timeseriesXScale(),
    slideChannelLabels: slideChannelLabels(),
    slideChannelLabelsKey: slideChannelLabelsKey(),
  });
  const runLoadPanels = useAtomSet(loadAnalysisPanelsAtom, {
    mode: "promise",
  });
  const loadPanelsForFile = async (file: StudioAnalysisCsvFile): Promise<ResultPanel[]> => {
    if (!activeWorkspacePath()) throw new Error("No workspace selected");
    return (await runLoadPanels(panelsParams(file))) as ResultPanel[];
  };
  const getCachedAnalysisPanels = (file: StudioAnalysisCsvFile): ResultPanel[] | undefined => {
    const workspacePath = activeWorkspacePath();
    if (!workspacePath) return undefined;
    const atom = analysisPanelsAtom(analysisPanelsParamsKey(panelsParams(file)));
    return resultData(registry.get(atom));
  };
  const hasAnyResultFiles = createMemo(() => analysisResultFiles().length > 0);
  const countRenderablePanels = (panels: ResultPanel[]) => countChartSpecs(panels);
  const savePdf = async () => {
    if (!activeWorkspacePath() || isSaving() || isSectionLoading() || !hasAnyResultFiles()) return;
    setIsSaving(true);
    setSaveMessage(null);
    setPanelError(null);
    try {
      const {
        buildResultPdf,
        loadAllResultPlotPanels,
        pdfBytesToBase64,
        RESULT_PDF_FILE_NAME,
        waitForExportPlots,
      } = await import("./save-result-pdf");
      const { timeseriesPanels, parameterPanels } = await loadAllResultPlotPanels(
        analysisResultFiles(),
        loadPanelsForFile,
      );
      setExportCapture({
        timeseriesPanels,
        parameterPanels,
      });
      await Promise.resolve();
      const timeseriesPage = exportTimeseriesEl;
      const parametersPage = exportParametersEl;
      if (!timeseriesPage && !parametersPage) {
        throw new Error("Nothing to export");
      }
      const pages: HTMLElement[] = [];
      const expectedPlots =
        countRenderablePanels(timeseriesPanels) + countRenderablePanels(parameterPanels);
      if (timeseriesPage && timeseriesPanels.length > 0) {
        await waitForExportPlots(timeseriesPage, countRenderablePanels(timeseriesPanels));
        pages.push(timeseriesPage);
      }
      if (parametersPage && parameterPanels.length > 0) {
        await waitForExportPlots(parametersPage, countRenderablePanels(parameterPanels));
        pages.push(parametersPage);
      }
      if (pages.length === 0) {
        throw new Error("No plots to export");
      }
      const pdfBytes = await buildResultPdf(pages);
      const response = await runClientEffect(
        studioClient.saveResultPdf({
          workspacePath: activeWorkspacePath()!,
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
    if (section === activeSection() || isSectionLoading() || isSaving()) return;
    setActiveSection(section);
  };
  createEffect(() => {
    const files = analysisResultFiles();
    if (files.length === 0) return;
    const current = activeSection();
    const currentFiles = filterResultFilesBySection(files, current);
    if (currentFiles.length > 0) return;
    setActiveSection(defaultResultPlotSection(files));
  });
  createEffect(() => {
    const files = sectionFiles();
    const section = activeSection();
    if (files.length === 0) {
      setSectionPanels([]);
      setIsSectionLoading(false);
      return;
    }
    let cancelled = false;
    setIsSectionLoading(true);
    setPanelError(null);
    const collectPanels = (panelsByFile: ResultPanel[][]) =>
      section === "timeseries"
        ? collectTimeseriesPanels(panelsByFile)
        : collectDisplayedParameterPanels(panelsByFile);
    const syncPanels = files.map((file) => getCachedAnalysisPanels(file));
    if (syncPanels.every((panels) => panels !== undefined)) {
      setSectionPanels(collectPanels(syncPanels as ResultPanel[][]));
      setIsSectionLoading(false);
      return;
    }
    void (async () => {
      try {
        const panelsByFile = await Promise.all(files.map((file) => loadPanelsForFile(file)));
        if (cancelled) return;
        setSectionPanels(collectPanels(panelsByFile));
      } catch (cause) {
        if (cancelled) return;
        setSectionPanels([]);
        setPanelError(cause instanceof Error ? cause.message : "Failed to load plot data");
      } finally {
        if (!cancelled) {
          setIsSectionLoading(false);
        }
      }
    })();
    onCleanup(() => {
      cancelled = true;
    });
  });
  const defaultInstruction = () =>
    activeSection() === "timeseries"
      ? "All timeseries plots are shown below."
      : "Parameter plots: mRNA lifetime, AUC, transfection efficiency, and translation onset.";
  const dockInstruction = () => saveMessage() ?? panelError() ?? defaultInstruction();
  const isBusy = () => isSectionLoading() || isSaving();
  const sectionToolActions = createMemo(() => [
    {
      id: "timeseries",
      label: "Timeseries",
      disabled: !hasTimeseriesFiles() || isBusy(),
      active: activeSection() === "timeseries",
      onSelect: () => switchSection("timeseries"),
    },
    {
      id: "parameters",
      label: "Parameters",
      disabled: !hasParameterFiles() || isBusy(),
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
                {isSectionLoading() ? (
                  <div class="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                    <Spinner class="size-4" />
                  </div>
                ) : null}
                <ResultPanelsGridView panels={sectionPanels()} section={activeSection()} />
                {exportCapture() ? (
                  <div
                    aria-hidden
                    class="pointer-events-none fixed top-0 -left-[10000px] w-[1200px] bg-white"
                  >
                    {exportCapture()!.timeseriesPanels.length > 0 ? (
                      <div ref={exportTimeseriesEl!}>
                        <ResultPanelsGridView
                          exportMode
                          pageTitle="Timeseries"
                          panels={exportCapture()!.timeseriesPanels}
                          section="timeseries"
                        />
                      </div>
                    ) : null}
                    {exportCapture()!.parameterPanels.length > 0 ? (
                      <div ref={exportParametersEl!}>
                        <ResultPanelsGridView
                          exportMode
                          pageTitle="Parameters"
                          panels={exportCapture()!.parameterPanels}
                          section="parameters"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </ViewportCard>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioResultDock
              instruction={dockInstruction()}
              saveDisabled={!activeWorkspacePath() || !hasAnyResultFiles() || isBusy()}
              saveLabel={isSaving() ? "Saving…" : "Save"}
              shortcutsEnabled={!isBusy()}
              toolActions={sectionToolActions()}
              onSave={() => {
                void savePdf();
              }}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}