import { liscaSessionStorage } from "@lisca/storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStudioProfileSession,
  readStudioProfileSession,
  studioProfileCanUseMemory,
  writeStudioProfileSession,
  STUDIO_PROFILE_SESSION_KEY,
} from "../src/profile/session";

describe("studio profile session", () => {
  beforeEach(() => {
    clearStudioProfileSession();
  });

  it("persists profile session in session storage", () => {
    writeStudioProfileSession({
      mode: "profile",
      profileId: "id-1",
      displayName: "alice",
    });
    expect(readStudioProfileSession()).toEqual({
      mode: "profile",
      profileId: "id-1",
      displayName: "alice",
    });
    expect(liscaSessionStorage().getItem(STUDIO_PROFILE_SESSION_KEY)).toBeTruthy();
  });

  it("guest mode disables memory", () => {
    writeStudioProfileSession({ mode: "guest" });
    expect(studioProfileCanUseMemory(readStudioProfileSession())).toBe(false);
  });
});
