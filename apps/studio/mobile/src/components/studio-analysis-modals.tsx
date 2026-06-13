import type { AnalysisProgress } from "@lisca/contracts";
import { clamp } from "@lisca/utils";
import {
  Button,
  DialogActions,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
  ShellProgress,
  Spinner,
  Text,
} from "@lisca/ui-native";
import { View } from "react-native";

import { useStudioAnnotatePage } from "../state/studio-annotate-page-context";

function isDoneStatus(status: AnalysisProgress["status"]) {
  return status === "completed" || status === "error";
}

export function StudioAnalysisStartModal() {
  const { state } = useStudioAnnotatePage();
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
          <Button size="sm" variant="outline" onPress={() => state.setAnalysisStartConfirm(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button size="sm" onPress={state.startAnalysis}>
            <Text>Start</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}

export function StudioAnalysisProgressModal() {
  const { state } = useStudioAnnotatePage();
  const progress = state.analysisProgress;
  if (!progress || isDoneStatus(progress.status)) return null;

  const pct = clamp(progress.progress, 0, 100);

  return (
    <ModalScrim open onClose={() => undefined}>
      <DialogSurface maxWidth={360}>
        <DialogTitleText>Running analysis</DialogTitleText>
        <View className="flex-row items-center gap-3">
          <Spinner />
          <DialogDescriptionText className="mb-0 min-w-0 flex-1" numberOfLines={1}>
            {progress.message ?? "Working"}
          </DialogDescriptionText>
        </View>
        <ShellProgress value={Math.round(pct)} />
        <Text className="mt-2 text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</Text>
      </DialogSurface>
    </ModalScrim>
  );
}
