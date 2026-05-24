import type { StudioAnalysisCsvFile } from "@lisca/contracts";
import { AppShell, DockButton, Spinner, ViewportCard } from "@lisca/ui";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { runClientEffect } from "@lisca/client/runtime";
import { toErrorMessage } from "../api/studio-client";
import { studioClient } from "../api/studio-port";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { ResultPanelsGridView, plotOptionsForPanel } from "../result/plot-charts";
import {
  collectDisplayedParameterPanels,
  collectTimeseriesPanels,
  defaultResultPlotSection,
  filterResultFilesBySection,
  intervalFromAssaySettings,
  type ResultPanel,
  type ResultPlotSection,
  type SlideChannelLabels,
} from "../result/plots";
import {
  fetchAnalysisPanels,
  getCachedAnalysisPanels,
  slideChannelLabelsCacheKey,
  useAnalysisResultsQuery,
} from "../result/queries";
import {
  buildResultPdf,
  loadAllResultPlotPanels,
  pdfBytesToBase64,
  RESULT_PDF_FILE_NAME,
  waitForExportPlots,
} from "../result/save-result-pdf";
import { useStudioAnnotateState } from "../state/use-studio-annotate-state";
import { useStudioStore } from "../state/studio-store";

export const Route = createFileRoute("/result")({
  component: ResultPage,
});

function ResultPage() {
  const queryClient = useQueryClient();
  const { workspacePath, analysisResultFiles, setAnalysisProgress, setAnalysisResultFiles } =
    useStudioAnnotateState();
  const info3 = useStudioStore((state) => state.info3);
  const timelapseAmount = useStudioStore((state) => state.info2.timelapseAmount);
  const timelapseUnit = useStudioStore((state) => state.info2.timelapseUnit);
  const activeWorkspacePath = workspacePath?.trim() || null;
  const timeseriesXScale = intervalFromAssaySettings(timelapseAmount, timelapseUnit);
  const slideChannelLabels = useMemo<SlideChannelLabels>(() => {
    const labels: SlideChannelLabels = {};
    for (const row of info3.samplesBySlide[info3.selectedSlideId]) {
      const channel = Number(row.channel);
      if (Number.isInteger(channel) && row.name.trim()) {
        labels[channel] = row.name.trim();
      }
    }
    return labels;
  }, [info3]);
  const slideChannelLabelsKey = useMemo(
    () => slideChannelLabelsCacheKey(slideChannelLabels),
    [slideChannelLabels],
  );
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

  const sectionFiles = useMemo(
    () => filterResultFilesBySection(analysisResultFiles, activeSection),
    [activeSection, analysisResultFiles],
  );
  const sectionFilePathsKey = useMemo(
    () => sectionFiles.map((file) => file.path).join("\0"),
    [sectionFiles],
  );
  const hasTimeseriesFiles = useMemo(
    () => filterResultFilesBySection(analysisResultFiles, "timeseries").length > 0,
    [analysisResultFiles],
  );
  const hasParameterFiles = useMemo(
    () => filterResultFilesBySection(analysisResultFiles, "parameters").length > 0,
    [analysisResultFiles],
  );

  const hasStoredResultFiles = analysisResultFiles.length > 0;
  const resultsQuery = useAnalysisResultsQuery(activeWorkspacePath, !hasStoredResultFiles);

  const loadPanelsForFile = useCallback(
    (file: StudioAnalysisCsvFile) =>
      fetchAnalysisPanels(
        queryClient,
        activeWorkspacePath,
        file,
        timeseriesXScale,
        slideChannelLabels,
        slideChannelLabelsKey,
      ),
    [activeWorkspacePath, queryClient, slideChannelLabels, slideChannelLabelsKey, timeseriesXScale],
  );

  const hasAnyResultFiles = analysisResultFiles.length > 0;

  const countRenderablePanels = useCallback(
    (panels: ResultPanel[]) => panels.filter((panel) => plotOptionsForPanel(panel) !== null).length,
    [],
  );

  const savePdf = useCallback(async () => {
    if (!activeWorkspacePath || isSaving || isSectionLoading || !hasAnyResultFiles) return;

    setIsSaving(true);
    setSaveMessage(null);
    setPanelError(null);

    try {
      const { timeseriesPanels, parameterPanels } = await loadAllResultPlotPanels(
        analysisResultFiles,
        loadPanelsForFile,
      );

      flushSync(() => {
        setExportCapture({ timeseriesPanels, parameterPanels });
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
  }, [
    activeWorkspacePath,
    analysisResultFiles,
    countRenderablePanels,
    hasAnyResultFiles,
    isSaving,
    isSectionLoading,
    loadPanelsForFile,
  ]);

  const switchSection = useCallback(
    (section: ResultPlotSection) => {
      if (section === activeSection || isSectionLoading || isSaving) return;
      setActiveSection(section);
    },
    [activeSection, isSaving, isSectionLoading],
  );

  useEffect(() => {
    const results = resultsQuery.data;
    if (!results) return;

    setAnalysisProgress(results);
    if (results.resultFiles && results.resultFiles.length > 0) {
      setAnalysisResultFiles(results.resultFiles);
    }
  }, [resultsQuery.data, setAnalysisProgress, setAnalysisResultFiles]);

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

    const getPanels = (file: StudioAnalysisCsvFile) =>
      getCachedAnalysisPanels(
        queryClient,
        activeWorkspacePath,
        file,
        timeseriesXScale,
        slideChannelLabelsKey,
      );

    const collectPanels = (panelsByFile: ResultPanel[][]) =>
      activeSection === "timeseries"
        ? collectTimeseriesPanels(panelsByFile)
        : collectDisplayedParameterPanels(panelsByFile);

    const syncPanels = sectionFiles.map((file) => getPanels(file));
    if (syncPanels.every((panels) => panels !== undefined)) {
      setSectionPanels(collectPanels(syncPanels));
      setIsSectionLoading(false);
      return;
    }

    void (async () => {
      try {
        const panelsByFile = await Promise.all(sectionFiles.map((file) => loadPanelsForFile(file)));
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
    activeWorkspacePath,
    loadPanelsForFile,
    queryClient,
    sectionFilePathsKey,
    sectionFiles,
    slideChannelLabelsKey,
    timeseriesXScale,
  ]);

  const defaultInstruction =
    activeSection === "timeseries"
      ? "All timeseries plots are shown below."
      : "Parameter plots: mRNA lifetime, AUC, transfection efficiency, and translation onset.";
  const dockInstruction = saveMessage ?? panelError ?? defaultInstruction;
  const isBusy = isSectionLoading || isSaving;

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
            <StudioDock
              instruction={dockInstruction}
              tool={
                <div className="flex w-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <DockButton
                      active={activeSection === "timeseries"}
                      disabled={!hasTimeseriesFiles || isBusy}
                      onClick={() => switchSection("timeseries")}
                    >
                      Timeseries
                    </DockButton>
                    <DockButton
                      active={activeSection === "parameters"}
                      disabled={!hasParameterFiles || isBusy}
                      onClick={() => switchSection("parameters")}
                    >
                      Parameters
                    </DockButton>
                  </div>
                </div>
              }
              action={
                <DockButton
                  disabled={!activeWorkspacePath || !hasAnyResultFiles || isBusy}
                  onClick={() => {
                    void savePdf();
                  }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </DockButton>
              }
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}
