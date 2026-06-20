import { AppShell, Spinner, Text, useThemeColors, ViewportCard } from "@lisca/ui-native";
import { resultData } from "@lisca/client/atoms";
import { runClientEffect } from "@lisca/client/runtime";
import {
  collectDisplayedParameterPanels,
  collectTimeseriesPanels,
  defaultResultPlotSection,
  filterResultFilesBySection,
  intervalFromAssaySettings,
  loadAllResultPlotPanels,
  type ResultPanel,
  type ResultPlotSection,
  type SlideChannelLabels,
  type TimeseriesPanel,
} from "@lisca/analysis";
import { countChartSpecs } from "@lisca/analysis/charts";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useWindowDimensions, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { studioClient, toErrorMessage } from "../api/studio-port";
import {
  analysisResultsAtom,
  analysisResultsIdleAtom,
  loadAnalysisPanelsAtom,
  slideChannelLabelsCacheKey,
} from "../atoms/studio-analysis-atoms";
import { STUDIO_NAV_WIDTH } from "../components/studio-layout";
import { StudioLeft } from "../components/studio-left";
import { StudioResultDock } from "../components/studio-result-dock";
import { ResultPanelsGridView } from "@lisca/ui-native/features";
import {
  buildResultPdfFromCaptures,
  pdfBytesToBase64,
  RESULT_PDF_FILE_NAME,
  waitForNativeExportRender,
  type ResultPdfCapturePage,
} from "./result-pdf";
import { useStudioResultState } from "../state/use-studio-result-state";
import { useStudioStore } from "../state/studio-store";

const chartColors = (colors: ReturnType<typeof useThemeColors>) => ({
  grid: colors.border,
  mutedText: colors.mutedForeground,
  primary: "#60a5fa",
  text: colors.foreground,
});

export function ResultPage() {
  const { width } = useWindowDimensions();
  const colors = useThemeColors();
  const { workspacePath, analysisResultFiles } = useStudioResultState();
  const info2 = useStudioStore((state) => state.info2);
  const info3 = useStudioStore((state) => state.info3);
  const resultsAtom = workspacePath ? analysisResultsAtom(workspacePath) : analysisResultsIdleAtom;
  const results = useAtomValue(resultsAtom);
  const progress = resultData(results);
  const [exporting, setExporting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ResultPlotSection>("timeseries");
  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [sectionPanels, setSectionPanels] = useState<ResultPanel[]>([]);
  const [exportCapture, setExportCapture] = useState<{
    timeseriesPanels: TimeseriesPanel[];
    parameterPanels: ResultPanel[];
  } | null>(null);
  const exportTimeseriesRef = useRef<View>(null);
  const exportParametersRef = useRef<View>(null);
  const timeseriesXScale = intervalFromAssaySettings(info2.timelapseAmount, info2.timelapseUnit);
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
  const sectionFiles = filterResultFilesBySection(analysisResultFiles, activeSection);
  const hasTimeseriesFiles =
    filterResultFilesBySection(analysisResultFiles, "timeseries").length > 0;
  const hasParameterFiles =
    filterResultFilesBySection(analysisResultFiles, "parameters").length > 0;
  const hasAnyResultFiles = analysisResultFiles.length > 0;
  const isBusy = isSectionLoading || exporting;
  const chartWidth = width - STUDIO_NAV_WIDTH * 2 - 48;
  const runLoadPanels = useAtomSet(loadAnalysisPanelsAtom, {
    mode: "promise",
  });
  const loadPanelsForFile = async (file: (typeof analysisResultFiles)[number]) => {
    if (!workspacePath) throw new Error("No workspace selected");
    return runLoadPanels({
      workspacePath,
      file,
      timeseriesXScale,
      slideChannelLabels,
      slideChannelLabelsKey,
    }) as Promise<ResultPanel[]>;
  };
  const switchSection = (section: ResultPlotSection) => {
    if (section === activeSection || isBusy) return;
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
    void (async () => {
      try {
        const panelsByFile = await Promise.all(
          sectionFiles.map((file) =>
            runLoadPanels({
              workspacePath: workspacePath ?? "",
              file,
              timeseriesXScale,
              slideChannelLabels,
              slideChannelLabelsKey,
            }),
          ),
        );
        if (cancelled) return;
        setSectionPanels(
          activeSection === "timeseries"
            ? collectTimeseriesPanels(panelsByFile)
            : collectDisplayedParameterPanels(panelsByFile),
        );
      } catch (cause) {
        if (cancelled) return;
        setSectionPanels([]);
        setPanelError(cause instanceof Error ? cause.message : "Failed to load result plots");
      } finally {
        if (!cancelled) setIsSectionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeSection,
    runLoadPanels,
    sectionFiles,
    slideChannelLabels,
    slideChannelLabelsKey,
    timeseriesXScale,
    workspacePath,
  ]);
  const defaultInstruction =
    activeSection === "timeseries"
      ? "All timeseries plots are shown below."
      : "Parameter plots: mRNA lifetime, AUC, transfection efficiency, and translation onset.";
  const dockInstruction = saveMessage ?? panelError ?? defaultInstruction;
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
  const captureExportPage = async (
    ref: RefObject<View | null>,
    title: string,
  ): Promise<ResultPdfCapturePage | null> => {
    if (!ref.current) return null;
    const imageBase64 = await captureRef(ref, {
      format: "jpg",
      quality: 0.92,
      result: "base64",
    });
    return {
      title,
      imageBase64,
      width: 1200,
      height: 800,
    };
  };
  const exportPdf = async () => {
    if (!workspacePath || exporting || isSectionLoading || !hasAnyResultFiles) return;
    setExporting(true);
    setSaveMessage(null);
    setPanelError(null);
    try {
      const { timeseriesPanels, parameterPanels } = await loadAllResultPlotPanels(
        analysisResultFiles,
        loadPanelsForFile,
      );
      const expectedPlots = countChartSpecs(timeseriesPanels) + countChartSpecs(parameterPanels);
      if (expectedPlots === 0) {
        throw new Error("No plots to export");
      }
      setExportCapture({ timeseriesPanels, parameterPanels });
      await waitForNativeExportRender();
      const pages: ResultPdfCapturePage[] = [];
      if (timeseriesPanels.length > 0) {
        const page = await captureExportPage(exportTimeseriesRef, "Timeseries");
        if (page) pages.push(page);
      }
      if (parameterPanels.length > 0) {
        const page = await captureExportPage(exportParametersRef, "Parameters");
        if (page) pages.push(page);
      }
      if (pages.length === 0) {
        throw new Error("Nothing to export");
      }
      const bytes = buildResultPdfFromCaptures(pages);
      const response = await runClientEffect(
        studioClient.saveResultPdf({
          workspacePath,
          fileName: RESULT_PDF_FILE_NAME,
          contentsBase64: pdfBytesToBase64(bytes),
        }),
      );
      setSaveMessage(`Saved PDF (${expectedPlots} plot(s)) to ${response.path}`);
    } catch (cause) {
      setSaveMessage(toErrorMessage(cause, "Failed to save PDF"));
    } finally {
      setExportCapture(null);
      setExporting(false);
    }
  };
  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={STUDIO_NAV_WIDTH}>
          <StudioLeft />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ViewportCard>
              <View className="min-h-0 flex-1 p-4">
                {isSectionLoading ? (
                  <View
                    className="absolute inset-0 z-[1] items-center justify-center"
                    style={{ backgroundColor: `${colors.background}B3` }}
                  >
                    <Spinner size="small" />
                  </View>
                ) : null}
                {sectionPanels.length > 0 ? (
                  <ResultPanelsGridView
                    colors={chartColors(colors)}
                    panels={sectionPanels}
                    width={chartWidth}
                  />
                ) : (
                  <View className="flex-1 justify-center gap-2 p-4">
                    <Text className="text-sm text-muted-foreground">
                      Status: {progress?.status ?? "idle"}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      CSV files: {analysisResultFiles.length}
                    </Text>
                  </View>
                )}
                {exportCapture ? (
                  <View
                    pointerEvents="none"
                    style={{ position: "absolute", left: -10000, top: 0, width: 1200 }}
                  >
                    {exportCapture.timeseriesPanels.length > 0 ? (
                      <ResultPanelsGridView
                        ref={exportTimeseriesRef}
                        colors={chartColors(colors)}
                        exportMode
                        pageTitle="Timeseries"
                        panels={exportCapture.timeseriesPanels}
                        section="timeseries"
                        width={1200}
                      />
                    ) : null}
                    {exportCapture.parameterPanels.length > 0 ? (
                      <ResultPanelsGridView
                        ref={exportParametersRef}
                        colors={chartColors(colors)}
                        exportMode
                        pageTitle="Parameters"
                        panels={exportCapture.parameterPanels}
                        section="parameters"
                        width={1200}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </ViewportCard>
          </AppShell.Main>
          <AppShell.Dock>
            <StudioResultDock
              instruction={dockInstruction}
              saveDisabled={!workspacePath || !hasAnyResultFiles || isBusy}
              saveLabel={exporting ? "Saving…" : "Save"}
              shortcutsEnabled={!isBusy}
              toolActions={sectionToolActions}
              onSave={() => void exportPdf()}
            />
          </AppShell.Dock>
        </AppShell.MainColumn>
        <AppShell.Right width={STUDIO_NAV_WIDTH} />
      </AppShell.Body>
    </AppShell>
  );
}
