import type { HostFilePickerMode, HostFsEntry, HostListDirectoryResult } from "@lisca/contracts";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "../../shell/chrome/buttons.tsx";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal.tsx";
import { useShellTheme } from "../../theme/shell-theme.tsx";
import { FILE_PICKER_ROW_HEIGHT, FilePickerRow } from "./host-file-picker-row.tsx";
import type { HostFilePickerOperations } from "./host-operations.ts";
function pathExtLower(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index).toLowerCase();
}
function fileMatchesMode(mode: HostFilePickerMode, entry: HostFsEntry): boolean {
  if (entry.isDirectory) return false;
  const ext = pathExtLower(entry.name);
  if (mode === "nd2_file") return ext === ".nd2";
  if (mode === "czi_file") return ext === ".czi";
  if (mode === "assay_json_file") return ext === ".json";
  return false;
}
function isDirectoryMode(mode: HostFilePickerMode): boolean {
  return mode === "workspace" || mode === "folder";
}
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
  const [list, setList] = useState<HostListDirectoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadPath = async (path: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await hostPort.listDirectory(path);
      setList(result);
    } catch (cause) {
      setList(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await hostPort.listDirectory(null);
        if (!cancelled) {
          setList(result);
        }
      } catch (cause) {
        if (!cancelled) {
          setList(null);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostPort, open]);
  const entries = (list?.entries ?? []).filter(
    (entry) => entry.isDirectory || fileMatchesMode(mode, entry) || isDirectoryMode(mode),
  );
  return (
    <ModalScrim open={open} onClose={() => onOpenChange(false)}>
      <DialogSurface accessibilityLabel={title}>
        <Text
          style={[
            styles.title,
            {
              color: colors.foreground,
            },
          ]}
        >
          {title}
        </Text>
        {list?.path ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
            }}
            numberOfLines={2}
          >
            {list.path}
          </Text>
        ) : null}
        {loading ? (
          <ActivityIndicator accessibilityLabel="Loading directory" color={colors.primary} />
        ) : null}
        {error ? (
          <Text
            style={{
              color: colors.destructive,
            }}
          >
            {error}
          </Text>
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
              onClose={() => onOpenChange(false)}
              onOpenDirectory={(path) => void loadPath(path)}
              onPickFile={onPickFile}
            />
          )}
        />
        <View style={styles.actions}>
          {list?.parent != null ? (
            <Button
              label="Up"
              variant="outline"
              compact
              onPress={() => void loadPath(list.parent === "" ? null : list.parent)}
            />
          ) : null}
          {isDirectoryMode(mode) && list?.path ? (
            <Button
              label="Select folder"
              onPress={() => {
                onPickDirectory(list.path!);
                onOpenChange(false);
              }}
            />
          ) : null}
          <Button label="Close" variant="ghost" onPress={() => onOpenChange(false)} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}
const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "600",
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
