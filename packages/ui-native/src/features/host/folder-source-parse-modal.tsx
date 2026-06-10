import type { FolderSource } from "@lisca/contracts";
import { DEFAULT_FOLDER_SOURCE_TEMPLATE, FOLDER_SOURCE_TEMPLATE_PRESETS } from "@lisca/contracts/assay";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../shell/chrome/buttons.tsx";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal.tsx";
import { useShellTheme } from "../../theme/shell-theme.tsx";
import type { HostFilePickerOperations } from "./host-operations.ts";

export type FolderSourceParseModalProps = {
  path: string | null;
  hostPort: Pick<HostFilePickerOperations, "listDirectory">;
  onClose: () => void;
  onConfirm: (source: FolderSource) => void;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templateRegex(template: string): RegExp {
  const source = template
    .split(/(\{(?:p|position|t|time|c|channel|z)\})/g)
    .map((part) => (part.startsWith("{") && part.endsWith("}") ? "(.+?)" : escapeRegex(part)))
    .join("");
  return new RegExp(`^${source}$`, "i");
}

function filenameStem(name: string): string {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(0, index) : name;
}

function isSupportedImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    !lower.endsWith("_seg.npy") &&
    (lower.endsWith(".tif") ||
      lower.endsWith(".tiff") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg"))
  );
}

async function directoryMatchesFilenameTemplate(
  directory: { path: string },
  filenameRegex: RegExp,
  hostPort: Pick<HostFilePickerOperations, "listDirectory">,
): Promise<boolean> {
  const listing = await hostPort.listDirectory(directory.path);
  return listing.entries
    .filter((entry) => !entry.isDirectory && isSupportedImageName(entry.name))
    .some((entry) => filenameRegex.test(filenameStem(entry.name)));
}

async function findMatchingDirectory(
  directories: { path: string }[],
  filenameRegex: RegExp,
  hostPort: Pick<HostFilePickerOperations, "listDirectory">,
): Promise<boolean> {
  if (directories.length === 0) return false;
  const [directory, ...rest] = directories;
  if (await directoryMatchesFilenameTemplate(directory, filenameRegex, hostPort)) {
    return true;
  }
  return findMatchingDirectory(rest, filenameRegex, hostPort);
}

async function detectPresetAtIndex(
  directories: { name: string; path: string; isDirectory: boolean }[],
  presetIndex: number,
  hostPort: Pick<HostFilePickerOperations, "listDirectory">,
): Promise<(typeof FOLDER_SOURCE_TEMPLATE_PRESETS)[number] | null> {
  if (presetIndex >= FOLDER_SOURCE_TEMPLATE_PRESETS.length) return null;

  const preset = FOLDER_SOURCE_TEMPLATE_PRESETS[presetIndex];
  const subfolderRegex = templateRegex(preset.subfolderTemplate);
  const filenameRegex = templateRegex(preset.filenameTemplate);
  const matchingDirectories = directories.filter((entry) => subfolderRegex.test(entry.name));
  const matched = await findMatchingDirectory(
    matchingDirectories.slice(0, 12),
    filenameRegex,
    hostPort,
  );
  if (matched) return preset;

  return detectPresetAtIndex(directories, presetIndex + 1, hostPort);
}

async function detectFolderSourceTemplate(
  path: string,
  hostPort: Pick<HostFilePickerOperations, "listDirectory">,
): Promise<(typeof FOLDER_SOURCE_TEMPLATE_PRESETS)[number] | null> {
  const root = await hostPort.listDirectory(path);
  const directories = root.entries.filter((entry) => entry.isDirectory);
  return detectPresetAtIndex(directories, 0, hostPort);
}

export function FolderSourceParseModal({
  path,
  hostPort,
  onClose,
  onConfirm,
}: FolderSourceParseModalProps) {
  const { colors } = useShellTheme();
  const [subfolderTemplate, setSubfolderTemplate] = useState<string>(
    DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
  );
  const [filenameTemplate, setFilenameTemplate] = useState<string>(
    DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
  );
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setDetecting(true);
    setDetected(false);
    setError(null);

    void detectFolderSourceTemplate(path, hostPort)
      .then((preset) => {
        if (cancelled) return;
        const next = preset ?? DEFAULT_FOLDER_SOURCE_TEMPLATE;
        setSubfolderTemplate(next.subfolderTemplate);
        setFilenameTemplate(next.filenameTemplate);
        setDetected(Boolean(preset));
      })
      .catch(() => {
        if (cancelled) return;
        setSubfolderTemplate(DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate);
        setFilenameTemplate(DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate);
        setDetected(false);
      })
      .finally(() => {
        if (!cancelled) setDetecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hostPort, path]);

  if (!path) return null;

  const confirm = () => {
    const filename = filenameTemplate.trim();
    if (!filename) {
      setError("Filename template is required.");
      return;
    }
    onConfirm({
      kind: "folder",
      path,
      subfolderTemplate: subfolderTemplate.trim(),
      filenameTemplate: filename,
    });
  };

  return (
    <ModalScrim open onClose={onClose}>
      <DialogSurface maxWidth={520}>
        <Text style={[styles.title, { color: colors.foreground }]}>Parse image folder</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={2}>
          {path}
        </Text>
        {detecting ? <ActivityIndicator color={colors.primary} /> : null}
        <Text style={{ color: colors.mutedForeground }}>
          {detecting
            ? "Detecting image naming pattern..."
            : detected
              ? "Detected image naming pattern."
              : "Using default image naming pattern."}
        </Text>
        <View style={styles.field}>
          <Text style={{ color: colors.foreground }}>Subfolder template</Text>
          <TextInput
            value={subfolderTemplate}
            onChangeText={setSubfolderTemplate}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.input,
                backgroundColor: colors.controlSurface,
              },
            ]}
          />
        </View>
        <View style={styles.field}>
          <Text style={{ color: colors.foreground }}>Filename template</Text>
          <TextInput
            value={filenameTemplate}
            onChangeText={(value) => {
              setFilenameTemplate(value);
              setError(null);
            }}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.input,
                backgroundColor: colors.controlSurface,
              },
            ]}
          />
          {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
        </View>
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={onClose} />
          <Button label="Open" onPress={confirm} />
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
  field: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
});
