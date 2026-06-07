import { Button, DialogSurface, ModalScrim, Spinner } from "@lisca/ui-native";
import { StyleSheet, Text, View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";
import { useStudioStore } from "../state/studio-store";
import { validateAssayForAnalysis } from "../utils/studio-assay-validation";

export function StudioAnalysisStartModal({ state }: { state: StudioAnnotateState }) {
  const assayId = useStudioStore((store) => store.assayId);
  const info1 = useStudioStore((store) => store.info1);
  const info2 = useStudioStore((store) => store.info2);
  const info3 = useStudioStore((store) => store.info3);

  if (!state.analysisStartConfirm) return null;

  const validation = validateAssayForAnalysis({ assayId, info1, info2, info3 });
  const canStart = validation.ok;

  return (
    <ModalScrim open onClose={() => state.setAnalysisStartConfirm(false)}>
      <DialogSurface maxWidth={420}>
        <Text style={styles.title}>Start analysis</Text>
        <Text style={styles.body}>
          Run the transfection analysis pipeline now and open results when finished?
        </Text>
        {!canStart ? (
          <View style={styles.errors}>
            {validation.errors.map((error) => (
              <Text key={error} style={styles.error}>
                • {error}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.body}>assay.json will be saved to the workspace before analysis starts.</Text>
        )}
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={() => state.setAnalysisStartConfirm(false)} />
          <Button label="Start" disabled={!canStart} onPress={state.startAnalysis} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

export function StudioAnalysisProgressModal({ state }: { state: StudioAnnotateState }) {
  const progress = state.analysisProgress;
  if (!progress) return null;
  if (progress.status !== "queued" && progress.status !== "running") return null;

  return (
    <ModalScrim open onClose={() => undefined}>
      <DialogSurface maxWidth={360}>
        <Text style={styles.title}>Analysis in progress</Text>
        <View style={styles.progressRow}>
          <Spinner />
          <Text style={styles.body}>{progress.message ?? progress.stage}</Text>
        </View>
        <Text style={styles.body}>{Math.round(progress.progress * 100)}%</Text>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  body: { fontSize: 14, marginBottom: 8 },
  errors: { gap: 4, marginBottom: 8 },
  error: { color: "#ef4444", fontSize: 13 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
