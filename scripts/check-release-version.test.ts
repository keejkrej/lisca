import { describe, expect, it } from "vite-plus/test";
import {
  assertReleaseVersions,
  desktopReleaseVersions,
  parseReleaseTag,
  versionFromReleaseTag,
} from "./check-release-version.ts";

describe("desktop release versions", () => {
  it("parses stable and prerelease tags", () => {
    expect(versionFromReleaseTag("v0.3.2")).toBe("0.3.2");
    expect(versionFromReleaseTag("v1.0.0-rc.1+build.8")).toBe("1.0.0-rc.1+build.8");
    expect(() => versionFromReleaseTag("0.3.2")).toThrow(/prefixed with "v"/);
    expect(() => versionFromReleaseTag("v1.0.0-01")).toThrow(/valid SemVer/);
    expect(parseReleaseTag("v0.4.9")).toEqual({ product: "studio", version: "0.4.9" });
    expect(parseReleaseTag("studio-v0.4.9")).toEqual({ product: "studio", version: "0.4.9" });
    expect(parseReleaseTag("aligner-v0.4.7")).toEqual({ product: "aligner", version: "0.4.7" });
    expect(parseReleaseTag("annotator-v1.2.3-rc.1")).toEqual({
      product: "annotator",
      version: "1.2.3-rc.1",
    });
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

  it("keeps the shipped Studio desktop product on the release train", () => {
    const entries = desktopReleaseVersions(process.cwd());
    expect(entries).toHaveLength(3);
    const version = entries[0].version;
    expect(assertReleaseVersions(`v${version}`, entries)).toBe(version);
  });

  it("checks only the app named by the tag", () => {
    const aligner = desktopReleaseVersions(process.cwd(), "aligner");
    const annotator = desktopReleaseVersions(process.cwd(), "annotator");
    expect(aligner).toHaveLength(3);
    expect(annotator).toHaveLength(3);
    expect(assertReleaseVersions("aligner-v0.4.7", aligner)).toBe("0.4.7");
    expect(assertReleaseVersions("annotator-v0.4.7", annotator)).toBe("0.4.7");
    expect(() => assertReleaseVersions("v0.4.9", aligner)).toThrow(/0\.4\.7/);
  });
});
