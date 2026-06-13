import type { FolderSource } from "@lisca/contracts";
import { useFolderSourceParseModal } from "@lisca/ui-headless/folder-source-parse-modal";
import { ActivityIndicator } from "react-native";

import { Button } from "../../../components/ui/button";
import { Field, FieldLabel } from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import { Text } from "../../../components/ui/text";
import {
  DialogActions,
  DialogDescriptionText,
  DialogErrorText,
  DialogTitleText,
} from "../../shell/modal/dialog-copy";
import { DialogSurface, ModalScrim } from "../../shell/modal/modal";
import { useThemeColors } from "../../theme/use-theme-colors";
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
  const colors = useThemeColors();
  const modal = useFolderSourceParseModal({ path, hostPort, onConfirm });

  if (!modal.path) return null;

  return (
    <ModalScrim open onClose={onClose}>
      <DialogSurface accessibilityLabel="Parse image folder">
        <DialogTitleText>Parse image folder</DialogTitleText>
        <DialogDescriptionText numberOfLines={2}>{modal.path}</DialogDescriptionText>
        {modal.detecting ? (
          <ActivityIndicator accessibilityLabel="Detecting pattern" color={colors.primary} />
        ) : (
          <DialogDescriptionText>{modal.statusMessage}</DialogDescriptionText>
        )}
        <Field className="w-full">
          <FieldLabel>Subfolder template</FieldLabel>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Pos{p}"
            value={modal.subfolderTemplate}
            onChangeText={(value) => {
              modal.setSubfolderTemplate(value);
              modal.setError(null);
            }}
          />
        </Field>
        <Field className="w-full">
          <FieldLabel>Filename template</FieldLabel>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="img_{t}_{c}_{z}.jpg"
            value={modal.filenameTemplate}
            onChangeText={(value) => {
              modal.setFilenameTemplate(value);
              modal.setError(null);
            }}
          />
          {modal.error ? <DialogErrorText>{modal.error}</DialogErrorText> : null}
        </Field>
        <DialogActions>
          <Button variant="outline" onPress={onClose}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={modal.confirm}>
            <Text>Open</Text>
          </Button>
        </DialogActions>
      </DialogSurface>
    </ModalScrim>
  );
}
