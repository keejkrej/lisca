import { describe, expect, it } from "vitest";

import { fileMatchesMode, isDirectoryMode } from "../src/host-file-picker-state.ts";

describe("host-file-picker-state", () => {
  it("isDirectoryMode recognizes workspace and folder", () => {
    expect(isDirectoryMode("workspace")).toBe(true);
    expect(isDirectoryMode("folder")).toBe(true);
    expect(isDirectoryMode("nd2_file")).toBe(false);
  });

  it("fileMatchesMode filters by extension", () => {
    const nd2 = { name: "sample.nd2", path: "/a/sample.nd2", isDirectory: false };
    const txt = { name: "readme.txt", path: "/a/readme.txt", isDirectory: false };
    expect(fileMatchesMode("nd2_file", nd2)).toBe(true);
    expect(fileMatchesMode("nd2_file", txt)).toBe(false);
    expect(fileMatchesMode("nd2_file", { ...nd2, isDirectory: true })).toBe(false);
  });
});
