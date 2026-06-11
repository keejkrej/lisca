import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { Button } from "../../shell/chrome/buttons";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { useShellTheme } from "../../theme/shell-theme";
import { liscaType } from "../../theme/typography";
import { FILE_PICKER_ROW_HEIGHT, FilePickerRow } from "./host-file-picker-row";
import type { HostFilePickerOperations } from "./host-operations";

export type HostFilePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostPort: HostFilePickerOperations;
  mode: HostFilePickerMode;
  title: string;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
};

export function HostFilePickerDialog({
  open,
  onOpenChange,
  hostPort,
  mode,
  title,
  onPickDirectory,
  onPickFile,
}: HostFilePickerDialogProps) {
  const { colors } = useShellTheme();
  const picker = useHostFilePickerState({
    open,
    mode,
    hostPort,
    onOpenChange,
    onPickDirectory,
    onPickFile,
  });

  if (!open) return null;

  const entries = picker.list?.entries ?? [];

  return (
    <ModalScrim open={open} onClose={() => onOpenChange(false)}>
      <DialogSurface accessibilityLabel={title}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {picker.locationLabel ? (
          <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {picker.locationLabel}
          </Text>
        ) : null}
        {picker.loading ? (
          <ActivityIndicator accessibilityLabel="Loading directory" color={colors.primary} />
        ) : null}
        {picker.error ? (
          <Text style={{ color: colors.destructive }}>{picker.error}</Text>
        ) : null}
        <FlatList
          data={entries}
          getItemLayout={(_, index) => ({
            index,
            length: FILE_PICKER_ROW_HEIGHT,
            offset: FILE_PICKER_ROW_HEIGHT * index,
          })}
          initialNumToRender={16}
          keyExtractor={(item) => item.path}
          removeClippedSubviews
          style={styles.list}
          windowSize={8}
          renderItem={({ item }) => (
            <FilePickerRow
              borderColor={colors.border}
              entry={item}
              foregroundColor={colors.foreground}
              muted={!item.isDirectory && !picker.dirMode && !picker.fileMatchesMode(item)}
              selected={picker.selectedFile?.path === item.path && !item.isDirectory}
              onPress={picker.handleRowClick}
            />
          )}
        />
        <View style={styles.actions}>
          {picker.canGoUp ? (
            <Button compact label="Up" variant="outline" onPress={picker.goUp} />
          ) : null}
          {picker.dirMode && picker.list?.path ? (
            <Button
              label="Select folder"
              onPress={picker.confirmDirectory}
            />
          ) : (
            <Button
              disabled={
                !picker.selectedFile ||
                picker.selectedFile.isDirectory ||
                !picker.fileMatchesMode(picker.selectedFile) ||
                picker.loading
              }
              label="Select file"
              onPress={picker.confirmFile}
            />
          )}
          <Button label="Close" variant="ghost" onPress={() => onOpenChange(false)} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: {
    ...liscaType.dialogTitle,
  },
  list: {
    maxHeight: 320,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
});
