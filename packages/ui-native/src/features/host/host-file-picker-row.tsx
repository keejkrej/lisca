import type { HostFsEntry } from "@lisca/contracts";
import { Pressable, StyleSheet, Text } from "react-native";

export const FILE_PICKER_ROW_HEIGHT = 44;

export type FilePickerRowProps = {
  entry: HostFsEntry;
  borderColor: string;
  foregroundColor: string;
  muted?: boolean;
  selected?: boolean;
  onPress: (entry: HostFsEntry) => void;
};

export const FilePickerRow = function FilePickerRow({
  entry,
  borderColor,
  foregroundColor,
  muted = false,
  selected = false,
  onPress,
}: FilePickerRowProps) {
  return (
    <Pressable
      accessibilityLabel={entry.isDirectory ? `Folder ${entry.name}` : `File ${entry.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.row,
        selected ? styles.selected : null,
        {
          borderColor,
          opacity: muted ? 0.6 : 1,
        },
      ]}
      onPress={() => onPress(entry)}
    >
      <Text style={{ color: foregroundColor }}>
        {entry.isDirectory ? "Folder" : "File"} {entry.name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 1,
    minHeight: FILE_PICKER_ROW_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selected: {
    backgroundColor: "rgba(127,127,127,0.12)",
  },
});
