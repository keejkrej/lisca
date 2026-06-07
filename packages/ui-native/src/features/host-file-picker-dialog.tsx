import type { HostFilePickerMode, HostFsEntry, HostListDirectoryResult } from "@lisca/contracts";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../shell/buttons.tsx";
import { DialogSurface, ModalScrim } from "../shell/modal.tsx";
import { useShellTheme } from "../theme/shell-theme.tsx";
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

  const loadPath = useCallback(
    async (path: string | null) => {
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
    },
    [hostPort],
  );

  useEffect(() => {
    if (!open) return;
    void loadPath(null);
  }, [loadPath, open]);

  const entries = (list?.entries ?? []).filter((entry) =>
    entry.isDirectory || fileMatchesMode(mode, entry) || isDirectoryMode(mode),
  );

  return (
    <ModalScrim open={open} onClose={() => onOpenChange(false)}>
      <DialogSurface>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {list?.path ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={2}>
            {list.path}
          </Text>
        ) : null}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
        <FlatList
          data={entries}
          keyExtractor={(item) => item.path}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderColor: colors.border }]}
              onPress={() => {
                if (item.isDirectory) {
                  void loadPath(item.path);
                  return;
                }
                onPickFile(item.path);
                onOpenChange(false);
              }}
            >
              <Text style={{ color: colors.foreground }}>{item.isDirectory ? "📁" : "📄"} {item.name}</Text>
            </Pressable>
          )}
        />
        <View style={styles.actions}>
          {list?.parent != null ? (
            <Button label="Up" variant="outline" compact onPress={() => void loadPath(list.parent)} />
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
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
});
