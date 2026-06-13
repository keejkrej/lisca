import {
  Button,
  DialogDescriptionText,
  DialogSurface,
  DialogTitleText,
  ModalScrim,
  Text,
} from "@lisca/ui-native";
import { View } from "react-native";

export function AssayOverwriteConfirmModal({
  open,
  saveTo,
  onCancel,
  onOverwrite,
}: {
  open: boolean;
  saveTo: string;
  onCancel: () => void;
  onOverwrite: () => void;
}) {
  if (!open) return null;

  return (
    <ModalScrim open={open} onClose={onCancel}>
      <DialogSurface maxWidth={384}>
        <DialogTitleText>assay.json already exists</DialogTitleText>
        <DialogDescriptionText>
          Overwrite the existing assay.json in this save folder?
        </DialogDescriptionText>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {saveTo}
        </Text>
        <View className="flex-row justify-end gap-2">
          <Button size="sm" variant="outline" onPress={onCancel}>
            <Text className="text-xs">Cancel</Text>
          </Button>
          <Button size="sm" onPress={onOverwrite}>
            <Text className="text-xs">Overwrite</Text>
          </Button>
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}
