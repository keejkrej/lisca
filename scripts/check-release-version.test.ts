import { describe, expect, it } from "vitest";
import {
  assertReleaseVersions,
  desktopReleaseVersions,
  versionFromReleaseTag,
} from "./check-release-version.ts";

describe("desktop release versions", () => {
  it("parses stable and prerelease tags", () => {
    expect(versionFromReleaseTag("v0.3.2")).toBe("0.3.2");
    expect(versionFromReleaseTag("v1.0.0-rc.1+build.8")).toBe("1.0.0-rc.1+build.8");
    expect(() => versionFromReleaseTag("0.3.2")).toThrow(/prefixed with "v"/);
    expect(() => versionFromReleaseTag("v1.0.0-01")).toThrow(/valid SemVer/);
  });

  it("reports every mismatched release-bearing manifest", () => {
    expect(() =>
      assertReleaseVersions("v0.3.2", [
        { path: "studio/package.json", version: "0.3.2" },
        { path: "studio/Cargo.toml", version: "0.1.0" },
        { path: "studio/tauri.conf.json", version: "0.2.0" },
      ]),
    ).toThrow(/studio\/Cargo\.toml: 0\.1\.0[\s\S]*studio\/tauri\.conf\.json: 0\.2\.0/);
  });

  it("keeps all shipped desktop products on one release train", () => {
    const entries = desktopReleaseVersions(process.cwd());
    expect(entries).toHaveLength(9);
    expect(assertReleaseVersions("v0.3.2", entries)).toBe("0.3.2");
  });
});
