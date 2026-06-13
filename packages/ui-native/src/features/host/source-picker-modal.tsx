import { View } from "react-native";

import { Button } from "../../shell/chrome/buttons";
import {
  DialogActions,
  DialogDescriptionText,
  DialogTitleText,
} from "../../shell/modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";

export type SourcePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void | Promise<void>;
  onOpenNd2: () => void | Promise<void>;
  onOpenCzi: () => void | Promise<void>;
};

export function SourcePickerModal(props: SourcePickerModalProps) {
  const handleSelect = async (fn: () => void | Promise<void>) => {
    props.onClose();
    await fn();
  };

  return (
    <ModalScrim open={props.open} onClose={props.onClose}>
      <DialogSurface>
        <DialogTitleText>Open Data</DialogTitleText>
        <DialogDescriptionText>Choose a source format.</DialogDescriptionText>
        <View className="gap-2">
          <Button label="Folder" onPress={() => void handleSelect(props.onOpenFolder)} />
          <Button label="ND2" onPress={() => void handleSelect(props.onOpenNd2)} />
          <Button label="CZI" onPress={() => void handleSelect(props.onOpenCzi)} />
        </View>
        <Button label="Close" variant="ghost" onPress={props.onClose} />
      </DialogSurface>
    </ModalScrim>
  );
}
