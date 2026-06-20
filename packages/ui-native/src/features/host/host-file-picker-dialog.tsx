import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import { ActivityIndicator, FlatList, Pressable, useWindowDimensions, View } from "react-native";
import { Home, X } from "lucide-react-native";

import { Button } from "../../../components/ui/button";
import { Icon } from "../../../components/ui/icon";
import { Text } from "../../../components/ui/text";
import {
  DialogDescriptionText,
  DialogErrorText,
  DialogTitleText,
} from "../../shell/modal/dialog-copy";
import {
  DIALOG_MAX_WIDTH,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSurface,
  ModalScrim,
} from "../../shell/modal/modal";
import { useThemeColors } from "../../theme/use-theme-colors";
import { FILE_PICKER_ROW_HEIGHT, HostFilePickerRow } from "./host-file-picker-row";
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

const LIST_MIN_HEIGHT = 220;

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
  const { height: windowHeight } = useWindowDimensions();
  const listMaxHeight = Math.min(360, Math.round(windowHeight * 0.42));

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
      <DialogSurface accessibilityLabel={title} maxWidth={DIALOG_MAX_WIDTH["2xl"]} padded={false}>
        <DialogHeader>
          <View className="w-full flex-row items-start justify-between gap-4">
            <View className="min-w-0 flex-1">
              <DialogTitleText>{title}</DialogTitleText>
              {picker.locationLabel ? (
                <DialogDescriptionText className="mt-1" numberOfLines={1}>
                  {picker.locationLabel}
                </DialogDescriptionText>
              ) : null}
              {description ? (
                <DialogDescriptionText className={picker.locationLabel ? "mt-1" : "mt-0.5"}>
                  {description}
                </DialogDescriptionText>
              ) : null}
            </View>
            <Button
              accessibilityLabel="Close file picker"
              className="shrink-0"
              size="icon"
              variant="ghost"
              onPress={() => onOpenChange(false)}
            >
              <Icon as={X} className="size-4" size={16} strokeWidth={2} />
            </Button>
          </View>
        </DialogHeader>

        <DialogBody className="gap-3">
          {recentItems && recentItems.length > 0 && onPickRecent ? (
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Recent</Text>
              <View className="max-h-32 overflow-hidden rounded-md border border-border">
                {recentItems.map((item) => (
                  <Pressable
                    key={item.path}
                    className="gap-0.5 border-b border-border/60 px-3 py-2 active:bg-muted/30"
                    onPress={() => onPickRecent(item.path)}
                  >
                    {item.label ? (
                      <Text className="font-medium text-foreground">{item.label}</Text>
                    ) : null}
                    <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                      {item.path}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            <Button
              disabled={!picker.canGoUp || picker.loading}
              size="sm"
              variant="outline"
              onPress={picker.goUp}
            >
              <Text className="text-xs">Up</Text>
            </Button>
            <Button
              disabled={picker.loading}
              size="sm"
              variant="outline"
              onPress={() => void picker.goHome()}
            >
              <Icon as={Home} className="size-4" size={16} strokeWidth={2} />
              <Text className="text-xs">Home</Text>
            </Button>
          </View>

          <View
            className="overflow-hidden rounded-md border border-border bg-background/50"
            style={{ minHeight: LIST_MIN_HEIGHT, maxHeight: listMaxHeight }}
          >
            {picker.loading ? (
              <View
                className="items-center justify-center gap-2"
                style={{ minHeight: LIST_MIN_HEIGHT }}
              >
                <ActivityIndicator accessibilityLabel="Loading directory" color={colors.primary} />
                <Text className="text-sm text-muted-foreground">Loading…</Text>
              </View>
            ) : picker.error ? (
              <View className="p-3">
                <DialogErrorText>{picker.error}</DialogErrorText>
              </View>
            ) : entries.length === 0 ? (
              <View className="items-center justify-center" style={{ minHeight: LIST_MIN_HEIGHT }}>
                <Text className="text-sm text-muted-foreground">No entries.</Text>
              </View>
            ) : (
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
                windowSize={8}
                renderItem={({ item }) => (
                  <HostFilePickerRow
                    entry={item}
                    muted={!item.isDirectory && !picker.dirMode && !picker.fileMatchesMode(item)}
                    selected={picker.selectedFile?.path === item.path && !item.isDirectory}
                    onPress={picker.handleRowClick}
                  />
                )}
              />
            )}
          </View>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          {picker.dirMode ? (
            <Button
              disabled={!picker.list?.path || picker.loading}
              onPress={picker.confirmDirectory}
            >
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
        </DialogFooter>
      </DialogSurface>
    </ModalScrim>
  );
}
