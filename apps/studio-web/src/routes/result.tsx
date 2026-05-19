import type { StudioAnalysisCsvFile } from "@lisca/contracts";
import { AppShell, Spinner } from "@lisca/ui";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { DockButton } from "../components/dock-button";
import { DockSection } from "../components/dock-section";
import { StudioDock } from "../components/studio-dock";
import { StudioLeft } from "../components/studio-left";
import { useStudioAnnotateState } from "../state/use-studio-annotate-state";
import { useStudioStore } from "../state/studio-store";
import { ResultPanelView } from "./result-plot-charts";
import {
  defaultResultPlotSection,
  filterResultFilesBySection,
  intervalFromAssaySettings,
  resolveCachedPanelByCursor,
  resolvePanelByCursor,
  type PanelCursor,
  type ResultPanel,
  type ResultPlotSection,
  type SlideChannelLabels,
} from "./result-plots";
import {
  fetchAnalysisPanels,
  getCachedAnalysisPanels,
  prefetchAnalysisPanels,
  slideChannelLabelsCacheKey,
  useAnalysisResultsQuery,
} from "./result-queries";

export const Route = createFileRoute("/result")({
  component: ResultPage,
});

function PlotPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-4 text-center text-muted-foreground text-sm">
      {children}
    </div>
  );
}

function ResultPage() {
  const queryClient = useQueryClient();
  const {
    workspacePath,
    analysisProgress,
    analysisResultFiles,
    setAnalysisProgress,
    setAnalysisResultFiles,
  } = useStudioAnnotateState();
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
  const panelHistoryRef = useRef<PanelCursor[]>([]);
  const latestPanelCursorRef = useRef("0:0");
  const showPanelRef = useRef<(cursor: PanelCursor, step: number) => void>(() => undefined);
  const [activeSection, setActiveSection] = useState<ResultPlotSection>("timeseries");
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ResultPanel | null>(null);
  const [currentPanelCursor, setCurrentPanelCursor] = useState<PanelCursor | null>(null);
  const [activePanelCursor, setActivePanelCursor] = useState<PanelCursor | null>(null);
  const [activePanelStep, setActivePanelStep] = useState(0);
  const [hasNextPanel, setHasNextPanel] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

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
  const hasResultsFiles = useMemo(
    () => filterResultFilesBySection(analysisResultFiles, "results").length > 0,
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
    [
      activeWorkspacePath,
      queryClient,
      slideChannelLabels,
      slideChannelLabelsKey,
      timeseriesXScale,
    ],
  );

  const showPanel = useCallback(
    (cursor: PanelCursor, step: number) => {
      if (sectionFiles.length === 0) {
        setActivePanel(null);
        setActivePanelCursor(null);
        setActivePanelStep(0);
        setHasNextPanel(false);
        setPanelError(null);
        return;
      }

      const cursorKey = `${cursor.fileIndex}:${cursor.panelIndex}`;
      latestPanelCursorRef.current = cursorKey;
      setPanelError(null);

      const getPanels = (file: StudioAnalysisCsvFile) =>
        getCachedAnalysisPanels(
          queryClient,
          activeWorkspacePath,
          file,
          timeseriesXScale,
          slideChannelLabelsKey,
        );

      const applyResolved = (resolved: {
        panel: ResultPanel;
        nextCursor: PanelCursor | null;
      }) => {
        setActivePanel(resolved.panel);
        setCurrentPanelCursor(cursor);
        setActivePanelCursor(resolved.nextCursor);
        setActivePanelStep(step);
        setHasNextPanel(Boolean(resolved.nextCursor));

        if (resolved.nextCursor) {
          const nextFile = sectionFiles[resolved.nextCursor.fileIndex];
          if (nextFile) {
            void prefetchAnalysisPanels(
              queryClient,
              activeWorkspacePath,
              nextFile,
              timeseriesXScale,
              slideChannelLabels,
              slideChannelLabelsKey,
            );
          }
        }
      };

      const syncResolved = resolveCachedPanelByCursor(sectionFiles, cursor, getPanels);
      if (syncResolved) {
        applyResolved(syncResolved);
        return;
      }

      setIsPanelLoading(true);

      void (async () => {
        try {
          const resolved = await resolvePanelByCursor(sectionFiles, cursor, loadPanelsForFile);
          if (latestPanelCursorRef.current !== cursorKey) return;
          if (!resolved) {
            setActivePanel(null);
            setActivePanelCursor(null);
            setActivePanelStep(0);
            setHasNextPanel(false);
            return;
          }

          applyResolved(resolved);
        } catch (cause) {
          if (latestPanelCursorRef.current !== cursorKey) return;
          setActivePanel(null);
          setPanelError(cause instanceof Error ? cause.message : "Failed to load plot data");
        } finally {
          if (latestPanelCursorRef.current === cursorKey) {
            setIsPanelLoading(false);
          }
        }
      })();
    },
    [
      activeWorkspacePath,
      loadPanelsForFile,
      queryClient,
      sectionFiles,
      slideChannelLabels,
      slideChannelLabelsKey,
      timeseriesXScale,
    ],
  );

  showPanelRef.current = showPanel;

  const switchSection = useCallback(
    (section: ResultPlotSection) => {
      if (section === activeSection || isPanelLoading) return;
      panelHistoryRef.current = [];
      setCanGoBack(false);
      setActiveSection(section);
    },
    [activeSection, isPanelLoading],
  );

  useEffect(() => {
    const results = resultsQuery.data;
    if (!results) return;

    setAnalysisProgress(results);
    if (results.resultFiles.length > 0) {
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
    panelHistoryRef.current = [];
    setCanGoBack(false);
    void showPanelRef.current({ fileIndex: 0, panelIndex: 0 }, 1);
  }, [
    activeSection,
    activeWorkspacePath,
    sectionFilePathsKey,
    slideChannelLabelsKey,
    timeseriesXScale,
  ]);

  const goNextPanel = () => {
    if (!activePanelCursor || !hasNextPanel || isPanelLoading || !currentPanelCursor) return;
    panelHistoryRef.current.push(currentPanelCursor);
    setCanGoBack(true);
    void showPanel(activePanelCursor, activePanelStep + 1);
  };

  const goBackPanel = () => {
    if (isPanelLoading || !canGoBack) return;
    const previous = panelHistoryRef.current.pop();
    if (!previous) return;
    setCanGoBack(panelHistoryRef.current.length > 0);
    void showPanel(previous, activePanelStep - 1);
  };

  const hasResultFiles = analysisResultFiles.length > 0;
  const hasSectionFiles = sectionFiles.length > 0;
  const isLoadingManifest =
    !hasResultFiles && Boolean(activeWorkspacePath) && resultsQuery.isLoading;

  const plotContent = (() => {
    if (isLoadingManifest) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading analysis outputs...
        </div>
      );
    }

    if (isPanelLoading && !activePanel) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading plot data...
        </div>
      );
    }

    if (panelError) {
      return <PlotPlaceholder>{panelError}</PlotPlaceholder>;
    }

    if (activePanel) {
      return (
        <div className="relative flex h-full min-h-0 flex-1 flex-col">
          {isPanelLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <Spinner className="size-4" />
            </div>
          ) : null}
          <ResultPanelView panel={activePanel} />
        </div>
      );
    }

    if (!activeWorkspacePath && !hasResultFiles) {
      return (
        <PlotPlaceholder>
          Select a workspace and run analysis from the annotate route first.
        </PlotPlaceholder>
      );
    }

    if (!hasResultFiles) {
      if (!analysisProgress) {
        return <PlotPlaceholder>No analysis found for this workspace.</PlotPlaceholder>;
      }
      if (!isDone(analysisProgress.status)) {
        return (
          <PlotPlaceholder>
            Analysis is still running. Plots will appear when CSV outputs are ready.
          </PlotPlaceholder>
        );
      }
      return <PlotPlaceholder>No CSV files received yet.</PlotPlaceholder>;
    }

    if (hasResultFiles && !hasSectionFiles) {
      return (
        <PlotPlaceholder>
          No {activeSection === "timeseries" ? "timeseries" : "results"} plots are available.
        </PlotPlaceholder>
      );
    }

    return (
      <PlotPlaceholder>
        CSV files were loaded, but none could be plotted. Check that outputs include numeric columns.
      </PlotPlaceholder>
    );
  })();

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left widthClass="w-60">
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <div className="flex h-full min-h-0 flex-col bg-muted/20">{plotContent}</div>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioDock
              instruction="Choose Timeseries or Results, then step with Back and Next."
              tool={
                <DockSection title="Tool">
                  <div className="flex w-full flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <DockButton
                        active={activeSection === "timeseries"}
                        disabled={!hasTimeseriesFiles || isPanelLoading}
                        onClick={() => switchSection("timeseries")}
                      >
                        Timeseries
                      </DockButton>
                      <DockButton
                        active={activeSection === "results"}
                        disabled={!hasResultsFiles || isPanelLoading}
                        onClick={() => switchSection("results")}
                      >
                        Results
                      </DockButton>
                    </div>
                  </div>
                </DockSection>
              }
              action={
                <div className="flex w-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <DockButton disabled={!canGoBack || isPanelLoading} onClick={goBackPanel}>
                      Back
                    </DockButton>
                    <DockButton
                      disabled={!hasNextPanel || isPanelLoading}
                      onClick={() => {
                        goNextPanel();
                      }}
                    >
                      Next
                    </DockButton>
                  </div>
                </div>
              }
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right widthClass="w-60" />
      </AppShell.Body>
    </AppShell>
  );
}

function isDone(status: string | null | undefined) {
  return status === "completed" || status === "error";
}
