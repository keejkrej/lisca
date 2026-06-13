import { AppShell, Spinner, Text, useThemeColors, ViewportCard } from "@lisca/ui-native";
import { resultData } from "@lisca/client/atoms";
import { runClientEffect } from "@lisca/client/runtime";
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
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { studioClient } from "../src/api/studio-port";
import {
  analysisResultsAtom,
  analysisResultsIdleAtom,
  loadAnalysisPanelsAtom,
  slideChannelLabelsCacheKey,
} from "../src/atoms/studio-analysis-atoms";
import { STUDIO_NAV_WIDTH } from "../src/components/studio-layout";
import { StudioLeft } from "../src/components/studio-left";
import { StudioResultDock } from "../src/components/studio-result-dock";
import { ResultPanelsGridView } from "@lisca/ui-native/features";
import { buildResultPdfFromCaptures, pdfBytesToBase64 } from "../src/result/result-pdf";
import { useStudioAnnotateState } from "../src/state/use-studio-annotate-state";
import { useStudioStore } from "../src/state/studio-store";
export default function ResultRoute() {
  const { width } = useWindowDimensions();
  const colors = useThemeColors();
  const { workspacePath, analysisResultFiles } = useStudioAnnotateState();
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
  const exportPdf = async () => {
    if (!workspacePath || exporting || isSectionLoading || !hasAnyResultFiles) return;
    setExporting(true);
    setSaveMessage(null);
    setPanelError(null);
    try {
      const bytes = buildResultPdfFromCaptures([]);
      await runClientEffect(
        studioClient.saveResultPdf({
          workspacePath,
          fileName: "result.pdf",
          contentsBase64: pdfBytesToBase64(bytes),
        }),
      );
      setSaveMessage("Saved PDF to result.pdf");
    } catch (cause) {
      setSaveMessage(cause instanceof Error ? cause.message : "Failed to save PDF");
    } finally {
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
                    colors={{
                      grid: colors.border,
                      mutedText: colors.mutedForeground,
                      primary: "#60a5fa",
                      text: colors.foreground,
                    }}
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

