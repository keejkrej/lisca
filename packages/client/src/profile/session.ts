import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/storage";

export const STUDIO_PROFILE_SESSION_KEY = "lisca-studio-profile-session";

export type StudioProfileSession =
  | { mode: "guest" }
  | { mode: "profile"; profileId: string; displayName: string; accessToken: string };

function isValidProfileSession(
  session: StudioProfileSession | null | undefined,
): session is Extract<StudioProfileSession, { mode: "profile" }> {
  return (
    session?.mode === "profile" &&
    typeof session.accessToken === "string" &&
    session.accessToken.trim().length > 0
  );
}

export function readStudioProfileSession(): StudioProfileSession | null {
  const session = readStorageJson<StudioProfileSession>(
    liscaSessionStorage(),
    STUDIO_PROFILE_SESSION_KEY,
  );
  if (session?.mode === "profile" && !isValidProfileSession(session)) {
    return null;
  }
  return session;
}

export function readStudioProfileAccessToken(): string | undefined {
  const session = readStudioProfileSession();
  return session?.mode === "profile" ? session.accessToken : undefined;
}

export function writeStudioProfileSession(session: StudioProfileSession): void {
  writeStorageJson(liscaSessionStorage(), STUDIO_PROFILE_SESSION_KEY, session);
}

export function clearStudioProfileSession(): void {
  liscaSessionStorage().removeItem(STUDIO_PROFILE_SESSION_KEY);
}

export function studioProfileCanUseMemory(session: StudioProfileSession | null): boolean {
  return isValidProfileSession(session);
}
