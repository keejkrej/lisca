import { AppShell, Button, Panel, Section } from "@lisca/ui-native";
import { resultData } from "@lisca/client/atoms";
import { runClientEffect } from "@lisca/client/runtime";
import {
  collectTimeseriesPanels,
  filterResultFilesBySection,
  intervalFromAssaySettings,
  type ResultPanel,
  type SlideChannelLabels,
} from "@lisca/studio-result";
import { useAtomSet, useAtomValue } from "@effect-atom/atom-react";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { studioClient } from "../src/api/studio-port";
import {
  analysisResultsAtom,
  analysisResultsIdleAtom,
  loadAnalysisPanelsAtom,
  slideChannelLabelsCacheKey,
} from "../src/atoms/studio-analysis-atoms";
import { StudioNavRail } from "../src/components/studio-nav-rail";
import {
  ResultPanelsGridView,
  pdfBytesToBase64,
  buildResultPdfFromCaptures,
} from "../src/result/native-charts";
import { useStudioAnnotateState } from "../src/state/use-studio-annotate-state";
import { useStudioStore } from "../src/state/studio-store";

export default function ResultRoute() {
  const { width } = useWindowDimensions();
  const { workspacePath, analysisResultFiles } = useStudioAnnotateState();
  const info2 = useStudioStore((state) => state.info2);
  const info3 = useStudioStore((state) => state.info3);
  const resultsAtom = workspacePath ? analysisResultsAtom(workspacePath) : analysisResultsIdleAtom;
  const results = useAtomValue(resultsAtom);
  const progress = resultData(results);
  const [exporting, setExporting] = useState(false);

  const timeseriesXScale = intervalFromAssaySettings(info2.timelapseAmount, info2.timelapseUnit);
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

  const timeseriesFiles = useMemo(
    () => filterResultFilesBySection(analysisResultFiles, "timeseries"),
    [analysisResultFiles],
  );

  const [panels, setPanels] = useState<ResultPanel[]>([]);
  const [panelError, setPanelError] = useState<string | null>(null);
  const runLoadPanels = useAtomSet(loadAnalysisPanelsAtom, { mode: "promise" });

  useEffect(() => {
    if (!workspacePath || timeseriesFiles.length === 0) {
      setPanels([]);
      setPanelError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const panelsByFile = await Promise.all(
          timeseriesFiles.map((file) =>
            runLoadPanels({
              workspacePath,
              file,
              timeseriesXScale,
              slideChannelLabels,
              slideChannelLabelsKey,
            }),
          ),
        );
        if (!cancelled) {
          setPanels(collectTimeseriesPanels(panelsByFile));
          setPanelError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setPanels([]);
          setPanelError(cause instanceof Error ? cause.message : "Failed to load result plots");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    workspacePath,
    timeseriesFiles,
    timeseriesXScale,
    slideChannelLabels,
    slideChannelLabelsKey,
    runLoadPanels,
  ]);

  const exportPdf = async () => {
    if (!workspacePath) return;
    setExporting(true);
    try {
      const bytes = buildResultPdfFromCaptures([]);
      await runClientEffect(
        studioClient.saveResultPdf({
          workspacePath,
          fileName: "result.pdf",
          contentsBase64: pdfBytesToBase64(bytes),
        }),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <AppShell.Body>
        <AppShell.Left width={96}>
          <StudioNavRail />
        </AppShell.Left>
        <AppShell.MainColumn>
          <AppShell.Main>
            <ScrollView contentContainerStyle={styles.content}>
              <Panel title="Analysis results">
                <Text>Status: {progress?.status ?? "idle"}</Text>
                <Text>CSV files: {analysisResultFiles.length}</Text>
                <Text>Timeseries plots: {panels.length}</Text>
                {panelError ? <Text style={styles.error}>{panelError}</Text> : null}
                <ResultPanelsGridView panels={panels} width={width - 140} />
              </Panel>
            </ScrollView>
          </AppShell.Main>
          <AppShell.Dock>
            <View style={styles.dock}>
              <Section title="Export">
                <Button label={exporting ? "Exporting..." : "Save result PDF"} onPress={() => void exportPdf()} />
              </Section>
            </View>
          </AppShell.Dock>
        </AppShell.MainColumn>
      </AppShell.Body>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  dock: { padding: 12 },
  error: { color: "#ef4444" },
});
