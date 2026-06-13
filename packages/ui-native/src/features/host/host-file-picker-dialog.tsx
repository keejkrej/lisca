import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import { ActivityIndicator, FlatList, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Text } from "../../../components/ui/text";
import {
  DialogActions,
  DialogDescriptionText,
  DialogErrorText,
  DialogTitleText,
} from "../../shell/modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { useThemeColors } from "../../theme/use-theme-colors";
import { FILE_PICKER_ROW_HEIGHT, FilePickerRow } from "./host-file-picker-row";
import type { HostFilePickerOperations } from "./host-operations";

export type HostFilePickerRecentItem = {
  path: string;
  label?: string;
};

export type HostFilePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostPort: HostFilePickerOperations;
  mode: HostFilePickerMode;
  title: string;
  description?: string;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
  recentItems?: readonly HostFilePickerRecentItem[];
  onPickRecent?: (path: string) => void;
};

export function HostFilePickerDialog({
  open,
  onOpenChange,
  hostPort,
  mode,
  title,
  description,
  onPickDirectory,
  onPickFile,
  recentItems,
  onPickRecent,
}: HostFilePickerDialogProps) {
  const colors = useThemeColors();
  const picker = useHostFilePickerState({
    open,
    mode,
    hostPort,
    onPickDirectory,
    onPickFile,
    onOpenChange,
  });

  if (!open) return null;

  const entries = picker.list?.entries ?? [];

  return (
    <ModalScrim open={open} onClose={() => onOpenChange(false)}>
      <DialogSurface accessibilityLabel={title}>
        <DialogTitleText>{title}</DialogTitleText>
        {description ? <DialogDescriptionText>{description}</DialogDescriptionText> : null}
        {picker.locationLabel ? (
          <DialogDescriptionText numberOfLines={2}>{picker.locationLabel}</DialogDescriptionText>
        ) : null}
        {picker.loading ? (
          <ActivityIndicator accessibilityLabel="Loading directory" color={colors.primary} />
        ) : null}
        {picker.error ? <DialogErrorText>{picker.error}</DialogErrorText> : null}
        {recentItems && recentItems.length > 0 && onPickRecent ? (
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Recent</Text>
            {recentItems.map((item) => (
              <Button
                key={item.path}
                size="sm"
                variant="outline"
                onPress={() => onPickRecent(item.path)}
              >
                <Text className="text-xs" numberOfLines={1}>
                  {item.label?.trim() || item.path}
                </Text>
              </Button>
            ))}
          </View>
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
          style={{ maxHeight: 320 }}
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
        <DialogActions>
          {picker.canGoUp ? (
            <Button size="sm" variant="outline" onPress={picker.goUp}>
              <Text className="text-xs">Up</Text>
            </Button>
          ) : null}
          {picker.dirMode && picker.list?.path ? (
            <Button onPress={picker.confirmDirectory}>
              <Text>Select folder</Text>
            </Button>
          ) : (
            <Button
              disabled={
                !picker.selectedFile ||
                picker.selectedFile.isDirectory ||
                !picker.fileMatchesMode(picker.selectedFile) ||
                picker.loading
              }
              onPress={picker.confirmFile}
            >
              <Text>Select file</Text>
            </Button>
          )}
          <Button variant="ghost" onPress={() => onOpenChange(false)}>
            <Text>Close</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
