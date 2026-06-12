"use client";

import type { StudioProfileSession } from "@lisca/client/profile/session";
import {
  clearStudioProfileSession,
  readStudioProfileAccessToken,
  readStudioProfileSession,
  studioProfileCanUseMemory,
  writeStudioProfileSession,
} from "@lisca/client/profile/session";
import { revokeStudioProfileSession } from "@lisca/client/profile/port";
import { useShellServer } from "@lisca/ui/shell";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";

import { studioProfileClient } from "../api/studio-profile-port";
import { ProfileGateDialog } from "./profile-gate-dialog";

export type StudioProfileContextValue = {
  session: StudioProfileSession;
  canUseMemory: boolean;
  switchProfile: () => void;
};

const StudioProfileSessionContext = createContext<StudioProfileSession | null>(null);
const StudioProfileSwitchContext = createContext<(() => void) | null>(null);

export function StudioProfileProvider({ children }: { children: ReactNode }) {
  const server = useShellServer();
  const [session, setSession] = useState<StudioProfileSession | null>(() =>
    readStudioProfileSession(),
  );

  const serverConnected = server.state === "open";

  const switchProfile = useRef(() => {
    if (readStudioProfileAccessToken()) {
      revokeStudioProfileSession(studioProfileClient);
    }
    clearStudioProfileSession();
    setSession(null);
  }).current;

  const completeSelection = (next: StudioProfileSession) => {
    writeStudioProfileSession(next);
    setSession(next);
  };

  const selectGuest = () => {
    completeSelection({ mode: "guest" });
  };

  const selectProfile = (profile: {
    profileId: string;
    displayName: string;
    accessToken: string;
  }) => {
    completeSelection({
      mode: "profile",
      profileId: profile.profileId,
      displayName: profile.displayName,
      accessToken: profile.accessToken,
    });
  };

  if (!session) {
    return (
      <ProfileGateDialog
        open
        serverConnected={serverConnected}
        onSelectGuest={selectGuest}
        onSelectProfile={selectProfile}
      />
    );
  }

  return (
    <StudioProfileSessionContext.Provider value={session}>
      <StudioProfileSwitchContext.Provider value={switchProfile}>
        {children}
      </StudioProfileSwitchContext.Provider>
    </StudioProfileSessionContext.Provider>
  );
}

export function useStudioProfile(): StudioProfileContextValue {
  const session = useContext(StudioProfileSessionContext);
  const switchProfile = useContext(StudioProfileSwitchContext);
  if (!session || !switchProfile) {
    throw new Error("useStudioProfile must be used within StudioProfileProvider after profile selection");
  }
  return {
    session,
    canUseMemory: studioProfileCanUseMemory(session),
    switchProfile,
  };
}
