import type { FolderSource } from "@lisca/contracts";
import { useFolderSourceParseModal } from "@lisca/ui-headless/folder-source-parse-modal";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../shell/chrome/buttons";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { useShellTheme } from "../../theme/shell-theme";
import { liscaFontFamily, liscaType } from "../../theme/typography";
import type { HostFilePickerOperations } from "./host-operations";

export type FolderSourceParseModalProps = {
  path: string | null;
  hostPort: Pick<HostFilePickerOperations, "listDirectory">;
  onClose: () => void;
  onConfirm: (source: FolderSource) => void;
};

export function FolderSourceParseModal({
  path,
  hostPort,
  onClose,
  onConfirm,
}: FolderSourceParseModalProps) {
  const { colors } = useShellTheme();
  const modal = useFolderSourceParseModal({ path, hostPort, onConfirm });

  if (!modal.path) return null;

  return (
    <ModalScrim open onClose={onClose}>
      <DialogSurface accessibilityLabel="Parse image folder">
        <Text style={[styles.title, { color: colors.foreground }]}>Parse image folder</Text>
        <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 12 }}>
          {modal.path}
        </Text>
        {modal.detecting ? (
          <ActivityIndicator accessibilityLabel="Detecting pattern" color={colors.primary} />
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{modal.statusMessage}</Text>
        )}
        <View style={styles.field}>
          <Text style={{ color: colors.foreground, fontSize: 13 }}>Subfolder template</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Pos{p}"
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input },
            ]}
            value={modal.subfolderTemplate}
            onChangeText={(value) => {
              modal.setSubfolderTemplate(value);
              modal.setError(null);
            }}
          />
        </View>
        <View style={styles.field}>
          <Text style={{ color: colors.foreground, fontSize: 13 }}>Filename template</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="img_{t}_{c}_{z}.jpg"
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.input },
            ]}
            value={modal.filenameTemplate}
            onChangeText={(value) => {
              modal.setFilenameTemplate(value);
              modal.setError(null);
            }}
          />
          {modal.error ? (
            <Text style={{ color: colors.destructive, fontSize: 12 }}>{modal.error}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button label="Cancel" variant="outline" onPress={onClose} />
          <Button label="Open" onPress={modal.confirm} />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  title: {
    ...liscaType.dialogTitle,
  },
  field: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: liscaFontFamily.sansRegular,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
});
