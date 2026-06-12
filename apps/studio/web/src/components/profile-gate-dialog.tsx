"use client";

import { runClientEffect } from "@lisca/client/runtime";
import type { ProfileSummary } from "@lisca/contracts";
import { Button, Input } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

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
    <ModalScrim>
      <DialogSurface aria-labelledby="profile-gate-title" maxWidth="lg">
        <div className="space-y-1 px-5 pb-2 pt-5">
          <h2 className="font-semibold text-foreground text-lg" id="profile-gate-title">
            Choose a profile
          </h2>
          <p className="text-muted-foreground text-sm">
            Profiles remember recent workspaces, sources, and assays. Guest mode does not save history.
          </p>
        </div>

        <div className="space-y-4 px-5 pb-5">
          {!serverConnected ? (
            <p className="text-muted-foreground text-sm">Connecting to Studio server…</p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive-foreground text-sm">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <p className="font-medium text-foreground text-sm">Existing profiles</p>
            <div className="max-h-40 overflow-auto rounded-lg border border-border">
              {loading ? (
                <p className="p-3 text-muted-foreground text-sm">Loading…</p>
              ) : profiles.length === 0 ? (
                <p className="p-3 text-muted-foreground text-sm">No profiles yet.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {profiles.map((profile) => (
                    <li key={profile.id}>
                      <button
                        className="flex w-full cursor-pointer items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/30"
                        type="button"
                        onClick={() =>
                          onSelectProfile({
                            profileId: profile.id,
                            displayName: profile.displayName,
                          })
                        }
                      >
                        <span className="font-medium text-foreground">{profile.displayName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-foreground text-sm">Create profile</p>
            <div className="flex gap-2">
              <Input
                autoComplete="off"
                className="min-w-0 flex-1"
                placeholder="Display name"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createProfile();
                }}
              />
              <Button disabled={!serverConnected || creating || !createName.trim()} type="button" onClick={() => void createProfile()}>
                Create
              </Button>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!serverConnected}
            type="button"
            variant="outline"
            onClick={onSelectGuest}
          >
            Continue as guest
          </Button>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
