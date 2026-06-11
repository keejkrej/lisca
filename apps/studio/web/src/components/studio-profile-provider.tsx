"use client";

import type { StudioProfileSession } from "@lisca/client/profile/session";
import {
  clearStudioProfileSession,
  readStudioProfileSession,
  studioProfileCanUseMemory,
  writeStudioProfileSession,
} from "@lisca/client/profile/session";
import { useShellServer } from "@lisca/ui/shell";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ProfileGateDialog } from "./profile-gate-dialog";

export type StudioProfileContextValue = {
  session: StudioProfileSession;
  canUseMemory: boolean;
  switchProfile: () => void;
};

const StudioProfileContext = createContext<StudioProfileContextValue | null>(null);

export function StudioProfileProvider({ children }: { children: ReactNode }) {
  const server = useShellServer();
  const [session, setSession] = useState<StudioProfileSession | null>(() =>
    readStudioProfileSession(),
  );

  const serverConnected = server.state === "open";

  const completeSelection = useCallback((next: StudioProfileSession) => {
    writeStudioProfileSession(next);
    setSession(next);
  }, []);

  const switchProfile = useCallback(() => {
    clearStudioProfileSession();
    setSession(null);
  }, []);

  const selectGuest = useCallback(() => {
    completeSelection({ mode: "guest" });
  }, [completeSelection]);

  const selectProfile = useCallback(
    (profile: { profileId: string; displayName: string }) => {
      completeSelection({
        mode: "profile",
        profileId: profile.profileId,
        displayName: profile.displayName,
      });
    },
    [completeSelection],
  );

  const contextValue = useMemo((): StudioProfileContextValue | null => {
    if (!session) return null;
    return {
      session,
      canUseMemory: studioProfileCanUseMemory(session),
      switchProfile,
    };
  }, [session, switchProfile]);

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
    <StudioProfileContext.Provider value={contextValue!}>
      {children}
    </StudioProfileContext.Provider>
  );
}

export function useStudioProfile(): StudioProfileContextValue {
  const value = useContext(StudioProfileContext);
  if (!value) {
    throw new Error("useStudioProfile must be used within StudioProfileProvider after profile selection");
  }
  return value;
}
