import type { HostFsEntry } from "@lisca/contracts";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export const FILE_PICKER_ROW_HEIGHT = 44;

export type FilePickerRowProps = {
  entry: HostFsEntry;
  borderColor: string;
  foregroundColor: string;
  onOpenDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
  onClose: () => void;
};

export const FilePickerRow = memo(function FilePickerRow({
  entry,
  borderColor,
  foregroundColor,
  onOpenDirectory,
  onPickFile,
  onClose,
}: FilePickerRowProps) {
  const handlePress = useCallback(() => {
    if (entry.isDirectory) {
      onOpenDirectory(entry.path);
      return;
    }
    onPickFile(entry.path);
    onClose();
  }, [entry.isDirectory, entry.path, onClose, onOpenDirectory, onPickFile]);

  return (
    <Pressable
      accessibilityLabel={entry.isDirectory ? `Folder ${entry.name}` : `File ${entry.name}`}
      accessibilityRole="button"
      style={[styles.row, { borderColor }]}
      onPress={handlePress}
    >
      <Text style={{ color: foregroundColor }}>
        {entry.isDirectory ? "Folder" : "File"} {entry.name}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: 1,
    minHeight: FILE_PICKER_ROW_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
