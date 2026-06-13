import { View } from "react-native";

import { Text } from "../../../components/ui/text";
import { Button } from "../../shell/chrome/buttons";
import { ShellProgress } from "../../shell/chrome/progress-bar";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { Spinner } from "../../shell/regions/panel";

export type SmartSegmentModelDialogProps = {
  state: {
    open: boolean;
    requiresDownload: boolean;
    progress: number;
    message: string;
    file?: string;
  };
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SmartSegmentModelDialog({
  state,
  busy,
  onConfirm,
  onCancel,
}: SmartSegmentModelDialogProps) {
  if (!state.open) return null;

  const loading = busy || state.progress > 0;
  const consent = state.requiresDownload && !loading;

  return (
    <ModalScrim open={true} onClose={onCancel}>
      <DialogSurface accessibilityLabel="Smart segment model download" maxWidth={384}>
        <Text className="font-medium text-foreground">Smart model</Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          {consent
            ? "Smart needs a one-time download of the SlimSAM model (~40 MB) before your first click can run."
            : loading
              ? state.requiresDownload
                ? "Downloading the SlimSAM model to your browser for local segmentation."
                : "Loading the cached SlimSAM model from your browser."
              : "Preparing smart…"}
        </Text>
        {loading ? (
          <View className="mt-4 gap-2">
            <View className="flex-row items-center gap-3">
              <Spinner size="small" />
              <Text className="min-w-0 flex-1 text-sm text-muted-foreground" numberOfLines={1}>
                {state.message}
              </Text>
            </View>
            <ShellProgress value={Math.max(0, Math.min(100, state.progress))} />
            <Text className="text-xs tabular-nums text-muted-foreground">
              {Math.round(state.progress)}%
            </Text>
          </View>
        ) : null}
        <View className="mt-4 flex-row gap-2">
          <Button
            className="min-w-0 flex-1"
            disabled={busy}
            label="Cancel"
            size="sm"
            variant="outline"
            onPress={onCancel}
          />
          {consent ? (
            <Button
              className="min-w-0 flex-1"
              disabled={busy}
              label="Download model"
              size="sm"
              onPress={onConfirm}
            />
          ) : null}
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}
