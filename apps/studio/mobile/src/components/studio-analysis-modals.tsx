import {
  Button,
  DialogActions,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
  ShellProgress,
  Spinner,
} from "@lisca/ui-native";
import { View } from "react-native";

import type { StudioAnnotateState } from "../state/use-studio-annotate-state";

export function StudioAnalysisStartModal({ state }: { state: StudioAnnotateState }) {
  if (!state.analysisStartConfirm) return null;

  return (
    <ModalScrim open onClose={() => state.setAnalysisStartConfirm(false)}>
      <DialogSurface maxWidth={420}>
        <DialogTitleText>Start analysis</DialogTitleText>
        <DialogDescriptionText>
          Run the analysis pipeline now and open results when finished?
        </DialogDescriptionText>
        <DialogDescriptionText>
          assay.json will be saved to the workspace before analysis starts. Annotations already
          saved under annotations/ will remain in the workspace.
        </DialogDescriptionText>
        <DialogActions>
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => state.setAnalysisStartConfirm(false)}
          />
          <Button label="Start" onPress={state.startAnalysis} />
        </DialogActions>
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
        <DialogTitleText>Analysis in progress</DialogTitleText>
        <View className="flex-row items-center gap-3">
          <Spinner />
          <DialogDescriptionText className="mb-0 flex-1">
            {progress.message ?? progress.stage}
          </DialogDescriptionText>
        </View>
        <ShellProgress value={Math.round(progress.progress * 100)} />
        <DialogDescriptionText>{Math.round(progress.progress * 100)}%</DialogDescriptionText>
      </DialogSurface>
    </ModalScrim>
  );
}
