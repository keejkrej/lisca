import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/storage";

export const STUDIO_PROFILE_SESSION_KEY = "lisca-studio-profile-session";

export type StudioProfileSession =
  | { mode: "guest" }
  | { mode: "profile"; profileId: string; displayName: string };

export function readStudioProfileSession(): StudioProfileSession | null {
  return readStorageJson<StudioProfileSession>(liscaSessionStorage(), STUDIO_PROFILE_SESSION_KEY);
}

export function writeStudioProfileSession(session: StudioProfileSession): void {
  writeStorageJson(liscaSessionStorage(), STUDIO_PROFILE_SESSION_KEY, session);
}

export function clearStudioProfileSession(): void {
  liscaSessionStorage().removeItem(STUDIO_PROFILE_SESSION_KEY);
}

export function studioProfileCanUseMemory(session: StudioProfileSession | null): boolean {
  return session?.mode === "profile";
}
