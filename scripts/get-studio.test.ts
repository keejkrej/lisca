import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const releases = [
  {
    tag_name: "notebooks-v0.1.4",
    draft: false,
    prerelease: false,
    assets: [{ name: "lisca-notebooks.zip", browser_download_url: "https://example.invalid/zip" }],
  },
  {
    tag_name: "studio-update",
    draft: false,
    prerelease: false,
    assets: [],
  },
  {
    tag_name: "studio-v0.4.12",
    draft: false,
    prerelease: false,
    assets: [
      {
        name: "Lisca.Studio_0.4.12_amd64.deb",
        browser_download_url: "https://example.invalid/deb",
      },
      {
        name: "Lisca.Studio_0.4.12_amd64.AppImage",
        browser_download_url: "https://example.invalid/appimage",
      },
      {
        name: "Lisca.Studio_0.4.12_amd64.AppImage.sig",
        browser_download_url: "https://example.invalid/sig",
      },
      {
        name: "Lisca Studio_0.4.12_amd64.AppImage.zsync",
        browser_download_url: "https://example.invalid/zsync",
      },
      {
        name: "Lisca.Studio_0.4.12_aarch64.dmg",
        browser_download_url: "https://example.invalid/dmg",
      },
      {
        name: "Lisca.Studio_0.4.12_x64-setup.exe",
        browser_download_url: "https://example.invalid/exe",
      },
    ],
  },
  {
    tag_name: "studio-v0.4.11",
    draft: false,
    prerelease: false,
    assets: [
      {
        name: "Lisca.Studio_0.4.11_amd64.AppImage",
        browser_download_url: "https://example.invalid/old",
      },
    ],
  },
  {
    tag_name: "aligner-v0.4.7",
    draft: false,
    prerelease: false,
    assets: [
      {
        name: "Lisca.Aligner_0.4.7_amd64.AppImage",
        browser_download_url: "https://example.invalid/aligner",
      },
    ],
  },
];

function printUrl(script: string, product: string, os: string, arch: string): string {
  const dir = mkdtempSync(join(tmpdir(), "lisca-get-studio-"));
  const payload = join(dir, "releases.json");
  writeFileSync(payload, JSON.stringify(releases));
  const result = spawnSync("bash", [script, "--print-url", product], {
    encoding: "utf8",
    env: {
      ...process.env,
      LISCA_RELEASES_JSON: payload,
      LISCA_OS: os,
      LISCA_ARCH: arch,
    },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${script} failed`);
  }
  return result.stdout.trim();
}

describe("get-studio installers", () => {
  const script = join(import.meta.dirname, "get-studio.sh");

  it("picks the AppImage from the newest studio release and ignores the deb", () => {
    expect(printUrl(script, "studio", "linux", "x86_64")).toBe("https://example.invalid/appimage");
  });

  it("picks the macOS disk image and the Windows installer", () => {
    expect(printUrl(script, "studio", "darwin", "aarch64")).toBe("https://example.invalid/dmg");
    expect(printUrl(script, "studio", "windows", "x86_64")).toBe("https://example.invalid/exe");
  });

  it("picks the requested app instead of Studio", () => {
    expect(printUrl(script, "aligner", "linux", "x86_64")).toBe("https://example.invalid/aligner");
  });

  it("fails when that app has no installer for the machine", () => {
    expect(() => printUrl(script, "annotator", "linux", "x86_64")).toThrow(/annotator-v/);
  });
});
