import { describe, expect, it } from "vite-plus/test";

import {
  buildUpdaterManifest,
  tauriUpdaterBuildConfig,
  updateChannelTag,
  updaterPlatform,
} from "./updater-manifest.ts";

const files = [
  { name: "Lisca.Studio_aarch64.app.tar.gz", signature: "mac-sig\n" },
  { name: "Lisca.Studio_0.4.10_aarch64.dmg", signature: "dmg-sig" },
  { name: "Lisca.Studio_0.4.10_x64-setup.exe", signature: "win-sig" },
  { name: "Lisca.Studio_0.4.10_amd64.deb", signature: "linux-sig" },
];

describe("updater manifest", () => {
  it("keeps each app on its own feed", () => {
    expect(updateChannelTag("studio")).toBe("studio-update");
    expect(updateChannelTag("aligner")).toBe("aligner-update");
    expect(updateChannelTag("annotator")).toBe("annotator-update");
  });

  it("ignores the macOS disk image and signs the updater payloads", () => {
    expect(updaterPlatform("Lisca.Studio_0.4.10_aarch64.dmg")).toBeNull();
    const manifest = buildUpdaterManifest({
      version: "0.4.10",
      notes: "Studio 0.4.10",
      pubDate: "2026-10-10T00:00:00.000Z",
      tag: "studio-v0.4.10",
      owner: "keejkrej",
      repo: "lisca",
      files,
    });
    expect(manifest.platforms["darwin-aarch64"]).toEqual({
      signature: "mac-sig",
      url: "https://github.com/keejkrej/lisca/releases/download/studio-v0.4.10/Lisca.Studio_aarch64.app.tar.gz",
    });
    expect(manifest.platforms["windows-x86_64"]?.url).toContain("_x64-setup.exe");
    expect(manifest.platforms["linux-x86_64"]?.signature).toBe("linux-sig");
    expect(Object.keys(manifest.platforms)).toHaveLength(3);
  });

  it("rejects a macOS archive that has no architecture", () => {
    expect(() => updaterPlatform("Lisca.Studio.app.tar.gz")).toThrow(/_aarch64/);
  });

  it("refuses two payloads for the same platform", () => {
    expect(() =>
      buildUpdaterManifest({
        version: "0.4.10",
        notes: "Studio 0.4.10",
        pubDate: "2026-10-10T00:00:00.000Z",
        tag: "studio-v0.4.10",
        owner: "keejkrej",
        repo: "lisca",
        files: [...files, { name: "Lisca.Studio_arm64.app.tar.gz", signature: "other-mac-sig" }],
      }),
    ).toThrow(/darwin-aarch64/);
  });

  it("refuses a manifest that is missing a platform", () => {
    expect(() =>
      buildUpdaterManifest({
        version: "0.4.10",
        notes: "Studio 0.4.10",
        pubDate: "2026-10-10T00:00:00.000Z",
        tag: "studio-v0.4.10",
        owner: "keejkrej",
        repo: "lisca",
        files: files.slice(0, 2),
      }),
    ).toThrow(/windows-x86_64/);
  });

  it("turns updater artifacts on only for a release build", () => {
    expect(tauriUpdaterBuildConfig(true)).toEqual({
      bundle: { createUpdaterArtifacts: true },
    });
    expect(tauriUpdaterBuildConfig(false)).toEqual({
      plugins: { updater: { endpoints: [] } },
    });
  });
});
