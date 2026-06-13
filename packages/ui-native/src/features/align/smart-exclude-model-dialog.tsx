import { View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import { ShellProgress } from "../../shell/chrome/progress-bar";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { Spinner } from "../../shell/regions/panel";

export type SmartExcludeModelDialogProps = {
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

export function SmartExcludeModelDialog({
  state,
  busy,
  onConfirm,
  onCancel,
}: SmartExcludeModelDialogProps) {
  if (!state.open) return null;

  const loading = busy || state.progress > 0;
  const consent = state.requiresDownload && !loading;

  return (
    <ModalScrim open={true} onClose={onCancel}>
      <DialogSurface accessibilityLabel="Smart exclude model download" maxWidth={384}>
        <Text className="font-medium text-foreground">Smart exclude model</Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          {consent
            ? "Smart exclude needs a one-time download of the ResNet classifier (~45 MB) before it can score cells."
            : loading
              ? state.requiresDownload
                ? "Downloading the smart exclusion model to your browser."
                : "Loading the cached smart exclusion model from your browser."
              : "Preparing smart exclude…"}
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
            size="sm"
            variant="outline"
            onPress={onCancel}
          >
            <Text className="text-xs">Cancel</Text>
          </Button>
          {consent ? (
            <Button className="min-w-0 flex-1" disabled={busy} size="sm" onPress={onConfirm}>
              <Text className="text-xs">Download model</Text>
            </Button>
          ) : null}
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}
