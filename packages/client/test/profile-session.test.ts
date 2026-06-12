import { configureLiscaStorage, liscaSessionStorage, type LiscaStorageAdapter } from "@lisca/storage";
import { beforeEach, describe, expect, it } from "vitest";

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

import {
  clearStudioProfileSession,
  readStudioProfileAccessToken,
  readStudioProfileSession,
  studioProfileCanUseMemory,
  writeStudioProfileSession,
  STUDIO_PROFILE_SESSION_KEY,
} from "../src/profile/session";

describe("studio profile session", () => {
  beforeEach(() => {
    configureLiscaStorage({ session: createMemoryStorage() });
    clearStudioProfileSession();
  });

  it("persists profile session with access token in session storage", () => {
    writeStudioProfileSession({
      mode: "profile",
      profileId: "id-1",
      displayName: "alice",
      accessToken: "token-1",
    });
    expect(readStudioProfileSession()).toEqual({
      mode: "profile",
      profileId: "id-1",
      displayName: "alice",
      accessToken: "token-1",
    });
    expect(readStudioProfileAccessToken()).toBe("token-1");
    expect(liscaSessionStorage().getItem(STUDIO_PROFILE_SESSION_KEY)).toBeTruthy();
  });

  it("treats legacy profile sessions without access token as invalid", () => {
    liscaSessionStorage().setItem(
      STUDIO_PROFILE_SESSION_KEY,
      JSON.stringify({
        mode: "profile",
        profileId: "id-1",
        displayName: "alice",
      }),
    );
    expect(readStudioProfileSession()).toBeNull();
    expect(readStudioProfileAccessToken()).toBeUndefined();
  });

  it("guest mode disables memory", () => {
    writeStudioProfileSession({ mode: "guest" });
    expect(studioProfileCanUseMemory(readStudioProfileSession())).toBe(false);
  });
});
