import { runClientEffect } from "@lisca/client/runtime";
import type { ProfileSummary } from "@lisca/contracts";
import { Button, DialogSurface, ModalScrim } from "@lisca/ui-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { studioProfileClient } from "../api/studio-profile-port";

export type ProfileGateDialogProps = {
  open: boolean;
  serverConnected: boolean;
  onSelectGuest: () => void;
  onSelectProfile: (profile: { profileId: string; displayName: string }) => void;
};

export function ProfileGateDialog({
  open,
  serverConnected,
  onSelectGuest,
  onSelectProfile,
}: ProfileGateDialogProps) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !serverConnected) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void runClientEffect(studioProfileClient.listProfiles())
      .then((response) => {
        if (!cancelled) setProfiles(response.profiles);
      })
      .catch((cause) => {
        if (!cancelled) {
          setProfiles([]);
          setError(cause instanceof Error ? cause.message : "Could not load profiles.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, serverConnected]);

  const createProfile = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await runClientEffect(studioProfileClient.createProfile(name));
      onSelectProfile({
        profileId: created.profileId,
        displayName: created.displayName,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create profile.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ModalScrim open={open} onClose={() => undefined}>
      <DialogSurface accessibilityLabel="Choose a profile" maxWidth={400}>
        <View style={styles.body}>
          <Text style={styles.title}>Choose a profile</Text>
          <Text style={styles.subtitle}>
            Profiles remember recent workspaces, sources, and assays. Guest mode does not save
            history.
          </Text>

          {!serverConnected ? (
            <Text style={styles.muted}>Connecting to Studio server…</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionLabel}>Existing profiles</Text>
          {loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : profiles.length === 0 ? (
            <Text style={styles.muted}>No profiles yet.</Text>
          ) : (
            profiles.map((profile) => (
              <Button
                key={profile.id}
                label={profile.displayName}
                onPress={() =>
                  onSelectProfile({
                    profileId: profile.id,
                    displayName: profile.displayName,
                  })
                }
              />
            ))
          )}

          <Text style={styles.sectionLabel}>Create profile</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Display name"
            style={styles.input}
            value={createName}
            onChangeText={setCreateName}
          />
          <Button
            disabled={!serverConnected || creating || !createName.trim()}
            label="Create"
            onPress={() => void createProfile()}
          />

          <Button
            disabled={!serverConnected}
            label="Continue as guest"
            onPress={onSelectGuest}
          />
        </View>
      </DialogSurface>
    </ModalScrim>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: "600" },
  subtitle: { fontSize: 14, opacity: 0.7 },
  sectionLabel: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  muted: { fontSize: 14, opacity: 0.7 },
  error: { fontSize: 14, color: "#b91c1c" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
});
