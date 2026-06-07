import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function ModalScrim(props: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={props.open} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.scrim} onPress={props.onClose}>
        <Pressable style={styles.content} onPress={(event) => event.stopPropagation()}>
          {props.children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogSurface(props: { children: ReactNode; maxWidth?: number }) {
  const { colors } = useShellTheme();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.background, borderColor: colors.border, maxWidth: props.maxWidth ?? 480 },
      ]}
    >
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 520,
  },
  surface: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
});
