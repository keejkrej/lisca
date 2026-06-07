import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

export type ServerAddressDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPort: number;
  localLabel: string;
  currentWsUrl: string;
  activeAddress: string | null;
  savedServers: string[];
  onConnect: (address: string | null) => void;
  onAddServer: (address: string) => void;
  onRemoveServer: (address: string) => void;
};

export function ServerAddressDialog(props: ServerAddressDialogProps) {
  const { colors } = useShellTheme();
  const [draft, setDraft] = useState("");

  return (
    <Modal visible={props.open} animationType="slide" transparent onRequestClose={() => props.onOpenChange(false)}>
      <View style={styles.scrim}>
        <View style={[styles.surface, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Server address</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{props.currentWsUrl}</Text>

          <Pressable
            style={[styles.rowButton, { borderColor: colors.border }]}
            onPress={() => {
              props.onConnect(null);
              props.onOpenChange(false);
            }}
          >
            <Text style={{ color: colors.foreground }}>Local ({props.localLabel})</Text>
          </Pressable>

          <ScrollView style={styles.list}>
            {props.savedServers.map((server) => (
              <View key={server} style={[styles.savedRow, { borderColor: colors.border }]}>
                <Pressable
                  style={styles.savedConnect}
                  onPress={() => {
                    props.onConnect(server);
                    props.onOpenChange(false);
                  }}
                >
                  <Text style={{ color: colors.foreground }}>{server}</Text>
                </Pressable>
                <Pressable onPress={() => props.onRemoveServer(server)}>
                  <Text style={{ color: colors.destructive }}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`host:${props.defaultPort}`}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
          />

          <View style={styles.actions}>
            <Pressable onPress={() => props.onOpenChange(false)}>
              <Text style={{ color: colors.mutedForeground }}>Close</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const trimmed = draft.trim();
                if (!trimmed) return;
                props.onAddServer(trimmed);
                props.onConnect(trimmed);
                setDraft("");
                props.onOpenChange(false);
              }}
            >
              <Text style={{ color: colors.primary }}>Add & connect</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  surface: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
  },
  rowButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  list: {
    maxHeight: 180,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  savedConnect: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
