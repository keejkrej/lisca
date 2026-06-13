import {
  Button,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
} from "@lisca/ui-native";
import { View } from "react-native";

export function AssaySaveConfirmModal({
  error,
  open,
  saving = false,
  onCancel,
  onSave,
  onSkip,
}: {
  error?: string | null;
  open: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  if (!open) return null;

  return (
    <ModalScrim open={open} onClose={onCancel}>
      <DialogSurface maxWidth={384}>
        <DialogTitleText>Basic info changed</DialogTitleText>
        <DialogDescriptionText>Save assay.json before leaving basic info?</DialogDescriptionText>
        {error ? <DialogDescriptionText className="text-destructive">{error}</DialogDescriptionText> : null}
        <View className="flex-row justify-end gap-2">
          <Button disabled={saving} label="Cancel" size="sm" variant="outline" onPress={onCancel} />
          <Button disabled={saving} label="Skip Save" size="sm" variant="outline" onPress={onSkip} />
          <Button disabled={saving} label={saving ? "Saving…" : "Save"} size="sm" onPress={onSave} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}
