import type { StudioAnalysisCsvFile } from "@lisca/contracts";
import { resultData } from "@lisca/client/atoms";
import { RegistryContext, useAtomSet } from "@effect-atom/atom-react";
import { Spinner } from "@lisca/ui/components";
import { AppShell, ViewportCard } from "@lisca/ui/shell";
import { useLatest } from "@lisca/ui/hooks";
import { useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { ResultPanelsGridView, plotOptionsForPanel } from "./plot-charts";
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
  const { workspacePath, analysisResultFiles } = useStudioResultState();
  const info3 = useStudioStore((state) => state.info3);
  const timelapseAmount = useStudioStore((state) => state.info2.timelapseAmount);
  const timelapseUnit = useStudioStore((state) => state.info2.timelapseUnit);
  const activeWorkspacePath = workspacePath?.trim() || null;
  const timeseriesXScale = intervalFromAssaySettings(timelapseAmount, timelapseUnit);
  const slideChannelLabels = (() => {
    const labels: SlideChannelLabels = {};
    for (const row of info3.samplesBySlide[info3.selectedSlideId]) {
      const channel = Number(row.channel);
      if (Number.isInteger(channel) && row.name.trim()) {
        labels[channel] = row.name.trim();
      }
    }
    return labels;
  })();
  const slideChannelLabelsKey = slideChannelLabelsCacheKey(slideChannelLabels);
  const [activeSection, setActiveSection] = useState<ResultPlotSection>("timeseries");
  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [sectionPanels, setSectionPanels] = useState<ResultPanel[]>([]);
  const [exportCapture, setExportCapture] = useState<{
    timeseriesPanels: ResultPanel[];
    parameterPanels: ResultPanel[];
  } | null>(null);
  const exportTimeseriesRef = useRef<HTMLDivElement>(null);
  const exportParametersRef = useRef<HTMLDivElement>(null);
  const sectionFiles = filterResultFilesBySection(analysisResultFiles, activeSection);
  const sectionFilePathsKey = sectionFiles.map((file) => file.path).join("\0");
  const hasTimeseriesFiles =
    filterResultFilesBySection(analysisResultFiles, "timeseries").length > 0;
  const hasParameterFiles =
    filterResultFilesBySection(analysisResultFiles, "parameters").length > 0;
  const panelsParams = (file: StudioAnalysisCsvFile) => ({
    workspacePath: activeWorkspacePath ?? "",
    file,
    timeseriesXScale,
    slideChannelLabels,
    slideChannelLabelsKey,
  });
  const runLoadPanels = useAtomSet(loadAnalysisPanelsAtom, {
    mode: "promise",
  });
  const loadPanelsForFile = async (file: StudioAnalysisCsvFile): Promise<ResultPanel[]> => {
    if (!activeWorkspacePath) throw new Error("No workspace selected");
    return (await runLoadPanels(panelsParams(file))) as ResultPanel[];
  };
  const getCachedAnalysisPanels = (file: StudioAnalysisCsvFile): ResultPanel[] | undefined => {
    if (!activeWorkspacePath) return undefined;
    const atom = analysisPanelsAtom(analysisPanelsParamsKey(panelsParams(file)));
    return resultData(registry.get(atom));
  };
  const loadPanelsForFileLatest = useLatest(loadPanelsForFile);
  const getCachedAnalysisPanelsLatest = useLatest(getCachedAnalysisPanels);
  const hasAnyResultFiles = analysisResultFiles.length > 0;
  const countRenderablePanels = (panels: ResultPanel[]) =>
    panels.filter((panel) => plotOptionsForPanel(panel) !== null).length;
  const savePdf = async () => {
    if (!activeWorkspacePath || isSaving || isSectionLoading || !hasAnyResultFiles) return;
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
        analysisResultFiles,
        loadPanelsForFile,
      );
      flushSync(() => {
        setExportCapture({
          timeseriesPanels,
          parameterPanels,
        });
      });
      const timeseriesPage = exportTimeseriesRef.current;
      const parametersPage = exportParametersRef.current;
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
          workspacePath: activeWorkspacePath,
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
    if (section === activeSection || isSectionLoading || isSaving) return;
    setActiveSection(section);
  };
  useEffect(() => {
    if (analysisResultFiles.length === 0) return;
    setActiveSection((current) => {
      const currentFiles = filterResultFilesBySection(analysisResultFiles, current);
      if (currentFiles.length > 0) return current;
      return defaultResultPlotSection(analysisResultFiles);
    });
  }, [analysisResultFiles]);
  useEffect(() => {
    if (sectionFiles.length === 0) {
      setSectionPanels([]);
      setIsSectionLoading(false);
      return;
    }
    let cancelled = false;
    setIsSectionLoading(true);
    setPanelError(null);
    const getPanels = (file: StudioAnalysisCsvFile) => getCachedAnalysisPanelsLatest.current(file);
    const collectPanels = (panelsByFile: ResultPanel[][]) =>
      activeSection === "timeseries"
        ? collectTimeseriesPanels(panelsByFile)
        : collectDisplayedParameterPanels(panelsByFile);
    const syncPanels = sectionFiles.map((file) => getPanels(file));
    if (syncPanels.every((panels) => panels !== undefined)) {
      setSectionPanels(collectPanels(syncPanels as ResultPanel[][]));
      setIsSectionLoading(false);
      return;
    }
    void (async () => {
      try {
        const panelsByFile = await Promise.all(
          sectionFiles.map((file) => loadPanelsForFileLatest.current(file)),
        );
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
    return () => {
      cancelled = true;
    };
  }, [
    activeSection,
    getCachedAnalysisPanelsLatest,
    loadPanelsForFileLatest,
    sectionFilePathsKey,
    sectionFiles,
  ]);
  const defaultInstruction =
    activeSection === "timeseries"
      ? "All timeseries plots are shown below."
      : "Parameter plots: mRNA lifetime, AUC, transfection efficiency, and translation onset.";
  const dockInstruction = saveMessage ?? panelError ?? defaultInstruction;
  const isBusy = isSectionLoading || isSaving;
  const sectionToolActions = [
    {
      id: "timeseries",
      label: "Timeseries",
      disabled: !hasTimeseriesFiles || isBusy,
      active: activeSection === "timeseries",
      onSelect: () => switchSection("timeseries"),
    },
    {
      id: "parameters",
      label: "Parameters",
      disabled: !hasParameterFiles || isBusy,
      active: activeSection === "parameters",
      onSelect: () => switchSection("parameters"),
    },
  ];
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ViewportCard className="relative">
              <div className="relative flex h-full min-h-0 flex-1 flex-col">
                {isSectionLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                    <Spinner className="size-4" />
                  </div>
                ) : null}
                <ResultPanelsGridView panels={sectionPanels} section={activeSection} />
                {exportCapture ? (
                  <div
                    aria-hidden
                    className="pointer-events-none fixed top-0 -left-[10000px] w-[1200px] bg-white"
                  >
                    {exportCapture.timeseriesPanels.length > 0 ? (
                      <div ref={exportTimeseriesRef}>
                        <ResultPanelsGridView
                          exportMode
                          pageTitle="Timeseries"
                          panels={exportCapture.timeseriesPanels}
                          section="timeseries"
                        />
                      </div>
                    ) : null}
                    {exportCapture.parameterPanels.length > 0 ? (
                      <div ref={exportParametersRef}>
                        <ResultPanelsGridView
                          exportMode
                          pageTitle="Parameters"
                          panels={exportCapture.parameterPanels}
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
              instruction={dockInstruction}
              saveDisabled={!activeWorkspacePath || !hasAnyResultFiles || isBusy}
              saveLabel={isSaving ? "Saving…" : "Save"}
              shortcutsEnabled={!isBusy}
              toolActions={sectionToolActions}
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
