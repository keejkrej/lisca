import { StyleSheet, Text, View } from "react-native";

import { Button } from "../../shell/chrome/buttons.tsx";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal.tsx";
import { useShellTheme } from "../../theme/shell-theme.tsx";

export type SourcePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void | Promise<void>;
  onOpenNd2: () => void | Promise<void>;
  onOpenCzi: () => void | Promise<void>;
};

export function SourcePickerModal(props: SourcePickerModalProps) {
  const { colors } = useShellTheme();
  const handleSelect = async (fn: () => void | Promise<void>) => {
    props.onClose();
    await fn();
  };

  return (
    <ModalScrim open={props.open} onClose={props.onClose}>
      <DialogSurface>
        <Text style={[styles.title, { color: colors.foreground }]}>Open Data</Text>
        <Text style={{ color: colors.mutedForeground }}>Choose a source format.</Text>
        <View style={styles.grid}>
          <Button label="Folder" onPress={() => void handleSelect(props.onOpenFolder)} />
          <Button label="ND2" onPress={() => void handleSelect(props.onOpenNd2)} />
          <Button label="CZI" onPress={() => void handleSelect(props.onOpenCzi)} />
        </View>
        <Button label="Close" variant="ghost" onPress={props.onClose} />
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  grid: {
    gap: 8,
  },
});
