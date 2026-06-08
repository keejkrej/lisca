import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export function ModalScrim(props: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      transparent
      visible={props.open}
      onRequestClose={props.onClose}
    >
      <Pressable style={styles.scrim} onPress={props.onClose}>
        <Pressable style={styles.content} onPress={(event) => event.stopPropagation()}>
          {props.children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogSurface(props: {
  children: ReactNode;
  maxWidth?: number;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useShellTheme();
  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      style={[
        styles.surface,
        props.padded === false ? styles.surfaceFlush : null,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          maxWidth: props.maxWidth ?? 480,
        },
      ]}
    >
      {props.children}
    </View>
  );
}

export function DialogHeader(props: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>{props.children}</View>
  );
}

export function DialogBody(props: { children: ReactNode; style?: object }) {
  return <View style={[styles.body, props.style]}>{props.children}</View>;
}

export function DialogFooter(props: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>{props.children}</View>
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
    overflow: "hidden",
  },
  surfaceFlush: {
    padding: 0,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  body: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footer: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
