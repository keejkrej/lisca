import { runClientEffect } from "@lisca/client/runtime";
import type { ProfileSummary } from "@lisca/contracts";
import {
  Button,
  DialogDescriptionText,
  DialogErrorText,
  DialogSectionLabel,
  DialogStack,
  DialogSurface,
  DialogTitleText,
  Input,
  ModalScrim,
  Text,
} from "@lisca/ui-native";
import { useEffect, useState } from "react";

import { studioProfileClient } from "../api/studio-profile-port";

export type ProfileGateDialogProps = {
  open: boolean;
  serverConnected: boolean;
  onSelectGuest: () => void;
  onSelectProfile: (profile: {
    profileId: string;
    displayName: string;
    accessToken: string;
  }) => void;
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
  const [signingIn, setSigningIn] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !serverConnected) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void runClientEffect(studioProfileClient.listProfiles())
      .then((response) => {
        if (!cancelled) setProfiles([...response.profiles]);
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
        accessToken: created.accessToken,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create profile.");
    } finally {
      setCreating(false);
    }
  };

  const signInExistingProfile = async (displayName: string) => {
    setSigningIn(displayName);
    setError(null);
    try {
      const session = await runClientEffect(studioProfileClient.signInProfile(displayName));
      onSelectProfile({
        profileId: session.profileId,
        displayName: session.displayName,
        accessToken: session.accessToken,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in to profile.");
    } finally {
      setSigningIn(null);
    }
  };

  return (
    <ModalScrim open={open} onClose={() => undefined}>
      <DialogSurface accessibilityLabel="Choose a profile" maxWidth={400}>
        <DialogStack className="p-4">
          <DialogTitleText>Choose a profile</DialogTitleText>
          <DialogDescriptionText>
            Profiles remember recent workspaces, sources, and assays. Guest mode does not save
            history.
          </DialogDescriptionText>

          {!serverConnected ? (
            <DialogDescriptionText>Connecting to Studio server…</DialogDescriptionText>
          ) : null}

          {error ? <DialogErrorText>{error}</DialogErrorText> : null}

          <DialogSectionLabel className="mt-2">Existing profiles</DialogSectionLabel>
          {loading ? (
            <DialogDescriptionText>Loading…</DialogDescriptionText>
          ) : profiles.length === 0 ? (
            <DialogDescriptionText>No profiles yet.</DialogDescriptionText>
          ) : (
            profiles.map((profile) => (
              <Button
                key={profile.id}
                disabled={signingIn !== null}
                onPress={() => void signInExistingProfile(profile.displayName)}
              >
                <Text>
                  {signingIn === profile.displayName ? "Signing in…" : profile.displayName}
                </Text>
              </Button>
            ))
          )}

          <DialogSectionLabel className="mt-2">Create profile</DialogSectionLabel>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Display name"
            value={createName}
            onChangeText={setCreateName}
          />
          <Button
            disabled={!serverConnected || creating || !createName.trim()}
            onPress={() => void createProfile()}
          >
            <Text>Create</Text>
          </Button>

          <Button disabled={!serverConnected} onPress={onSelectGuest}>
            <Text>Continue as guest</Text>
          </Button>
        </DialogStack>
      </DialogSurface>
    </ModalScrim>
  );
}
