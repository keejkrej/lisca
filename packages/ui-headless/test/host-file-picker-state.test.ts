import { describe, expect, it } from "vite-plus/test";

import {
  canGoUpFromList,
  favoriteLabel,
  fileMatchesMode,
  driveForPath,
  hostFilePickerLocationLabel,
  isDirectoryMode,
  nativeFilePickerLabel,
  nativePickerExtensions,
  normalizeFavoritePaths,
  recentLabel,
  parentPathForGoUp,
  toggleFavoritePath,
  visibleEntries,
} from "../src/host-file-picker-state";

describe("host-file-picker-state", () => {
  it("isDirectoryMode recognizes workspace and folder", () => {
    expect(isDirectoryMode("workspace")).toBe(true);
    expect(isDirectoryMode("folder")).toBe(true);
    expect(isDirectoryMode("nd2_file")).toBe(false);
  });

  it("canGoUpFromList requires a parent path", () => {
    expect(canGoUpFromList(null)).toBe(false);
    expect(canGoUpFromList({ path: null, parent: null, entries: [] })).toBe(false);
    expect(canGoUpFromList({ path: "/", parent: null, entries: [] })).toBe(false);
    expect(canGoUpFromList({ path: "/workspace", parent: "", entries: [] })).toBe(true);
    expect(canGoUpFromList({ path: "/workspace/run-1", parent: "/workspace", entries: [] })).toBe(
      true,
    );
  });

  it("parentPathForGoUp maps chroot boundary to synthetic roots", () => {
    expect(parentPathForGoUp(null)).toBe(null);
    expect(parentPathForGoUp("")).toBe(null);
    expect(parentPathForGoUp("/workspace")).toBe("/workspace");
  });

  it("fileMatchesMode filters by extension", () => {
    const nd2 = { name: "sample.nd2", path: "/a/sample.nd2", isDirectory: false };
    const txt = { name: "readme.txt", path: "/a/readme.txt", isDirectory: false };
    expect(fileMatchesMode("nd2_file", nd2)).toBe(true);
    expect(fileMatchesMode("nd2_file", txt)).toBe(false);
    expect(fileMatchesMode("nd2_file", { ...nd2, isDirectory: true })).toBe(false);
  });

  it("matches a Windows path to its drive letter", () => {
    const drives = [
      { letter: "C:", path: "C:\\" },
      { letter: "E:", path: "E:\\" },
    ];
    expect(driveForPath("C:\\Users\\ana\\Documents", drives)?.letter).toBe("C:");
    expect(driveForPath("e:/imaging", drives)?.path).toBe("E:\\");
    expect(driveForPath("/Users/ana", drives)).toBeNull();
    expect(driveForPath(null, drives)).toBeNull();
  });

  it("names the desktop dialog after the host system", () => {
    expect(nativeFilePickerLabel("Win32", false)).toBe("Open in Explorer");
    expect(nativeFilePickerLabel("MacIntel", false)).toBe("Open in Finder");
    expect(nativeFilePickerLabel("Linux x86_64", false)).toBe("Open in Files");
    expect(nativeFilePickerLabel("", true)).toBe("Open in Explorer");
  });

  it("filters the native file dialog by picker mode", () => {
    expect(nativePickerExtensions("nd2_file")).toEqual(["nd2"]);
    expect(nativePickerExtensions("czi_file")).toEqual(["czi"]);
    expect(nativePickerExtensions("assay_json_file")).toEqual(["json"]);
    expect(nativePickerExtensions("workspace")).toEqual([]);
  });

  it("hostFilePickerLocationLabel hides empty and root-list paths", () => {
    expect(hostFilePickerLocationLabel(null)).toBe(null);
    expect(hostFilePickerLocationLabel({ path: null, parent: null, entries: [] })).toBe(null);
    expect(hostFilePickerLocationLabel({ path: "", parent: null, entries: [] })).toBe(null);
    expect(hostFilePickerLocationLabel({ path: "  ", parent: null, entries: [] })).toBe(null);
    expect(
      hostFilePickerLocationLabel({ path: "/Users/jack", parent: "/Users", entries: [] }),
    ).toBe("/Users/jack");
  });

  it("visibleEntries drops dot-prefixed entries unless hidden items are shown", () => {
    const entries = [
      { name: ".cache", path: "/a/.cache", isDirectory: true },
      { name: "data", path: "/a/data", isDirectory: true },
      { name: ".env", path: "/a/.env", isDirectory: false },
    ];
    expect(visibleEntries(entries, false).map((entry) => entry.name)).toEqual(["data"]);
    expect(visibleEntries(entries, true)).toHaveLength(3);
  });

  it("favoriteLabel uses the last path segment", () => {
    expect(favoriteLabel("/Users/jack/data")).toBe("data");
    expect(favoriteLabel("/Users/jack/data/")).toBe("data");
    expect(favoriteLabel("C:\\Users\\jack\\data")).toBe("data");
    expect(favoriteLabel("/")).toBe("/");
  });

  it("favorite paths toggle and normalize stored values", () => {
    expect(toggleFavoritePath([], "/a")).toEqual(["/a"]);
    expect(toggleFavoritePath(["/a", "/b"], "/a")).toEqual(["/b"]);
    expect(normalizeFavoritePaths(null)).toEqual([]);
    expect(normalizeFavoritePaths(["/a", 3, "", "/a", "/b"])).toEqual(["/a", "/b"]);
  });

  it("recentLabel names an assay.json after its folder", () => {
    expect(recentLabel("/Users/jack/data/TF84_portable/assay.json")).toBe("TF84_portable");
    expect(recentLabel("C:\\data\\TF85\\assay.json")).toBe("TF85");
    expect(recentLabel("/Users/jack/data/run.nd2")).toBe("run.nd2");
    expect(recentLabel("/Users/jack/workspace")).toBe("workspace");
  });
});
