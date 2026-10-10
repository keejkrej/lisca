/**
 * Build the static updater manifest for one desktop app.
 *
 * Studio, Aligner, and Annotator each have their own version and their own
 * GitHub Release feed (`studio-update`, `aligner-update`, `annotator-update`).
 * A version tag uploads installers; this manifest points at those files.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseReleaseTag, type DesktopProduct } from "./check-release-version.ts";

export interface UpdaterPayload {
  name: string;
  signature: string;
}

export interface UpdaterManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { signature: string; url: string }>;
}

const PRODUCT_LABEL: Record<DesktopProduct, string> = {
  aligner: "Aligner",
  annotator: "Annotator",
  studio: "Studio",
};

const REQUIRED_PLATFORMS = ["darwin-aarch64", "windows-x86_64", "linux-x86_64"] as const;

export function updateChannelTag(product: DesktopProduct): string {
  return `${product}-update`;
}

/** Release builds sign updater artifacts. Every other build clears the feed. */
export function tauriUpdaterBuildConfig(releaseArtifacts: boolean): Record<string, unknown> {
  if (releaseArtifacts) return { bundle: { createUpdaterArtifacts: true } };
  return { plugins: { updater: { endpoints: [] } } };
}

export function updaterPlatform(name: string): string | null {
  const os = name.endsWith(".app.tar.gz")
    ? "darwin"
    : name.endsWith(".exe")
      ? "windows"
      : name.endsWith(".deb")
        ? "linux"
        : null;
  if (!os) return null;
  // Tauri omits the architecture from "<Product>.app.tar.gz". The release job
  // stamps `_aarch64` onto that archive before upload. An unstamped name fails
  // here so a partial feed is not published.
  const arch =
    name.includes("aarch64") || name.includes("arm64")
      ? "aarch64"
      : name.includes("x86_64") || name.includes("x64") || name.includes("amd64")
        ? "x86_64"
        : null;
  if (!arch) {
    throw new Error(
      `Cannot tell the architecture of updater asset "${name}". Stamp the macOS archive with _aarch64 before upload.`,
    );
  }
  return `${os}-${arch}`;
}

export function buildUpdaterManifest(input: {
  version: string;
  notes: string;
  pubDate: string;
  tag: string;
  owner: string;
  repo: string;
  files: UpdaterPayload[];
}): UpdaterManifest {
  const platforms: UpdaterManifest["platforms"] = {};
  for (const file of input.files) {
    const platform = updaterPlatform(file.name);
    if (!platform) continue;
    const signature = file.signature.trim();
    if (!signature) throw new Error(`Missing signature for ${file.name}.`);
    if (platforms[platform]) {
      throw new Error(`Update manifest already has ${platform} (${file.name}).`);
    }
    const url = `https://github.com/${input.owner}/${input.repo}/releases/download/${encodeURIComponent(input.tag)}/${encodeURIComponent(file.name)}`;
    platforms[platform] = { signature, url };
  }
  for (const platform of REQUIRED_PLATFORMS) {
    if (!platforms[platform]) throw new Error(`Update manifest is missing ${platform}.`);
  }
  return {
    version: input.version,
    notes: input.notes,
    pub_date: input.pubDate,
    platforms,
  };
}

function arg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function gh(args: string[]): string {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || `gh ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function main(): void {
  const tag = arg("--tag");
  const parsed = parseReleaseTag(tag);
  const ownerRepo = arg("--repo");
  const [owner, repo] = ownerRepo.split("/");
  if (!owner || !repo) throw new Error(`--repo must be owner/name; received "${ownerRepo}".`);

  const listed = JSON.parse(
    gh(["release", "view", tag, "--repo", ownerRepo, "--json", "assets"]),
  ) as { assets: { name: string }[] };
  const sigDir = mkdtempSync(join(tmpdir(), "lisca-updater-"));
  gh([
    "release",
    "download",
    tag,
    "--repo",
    ownerRepo,
    "--pattern",
    "*.sig",
    "--dir",
    sigDir,
    "--clobber",
  ]);

  const files: UpdaterPayload[] = [];
  for (const asset of listed.assets) {
    if (!updaterPlatform(asset.name)) continue;
    files.push({
      name: asset.name,
      signature: readFileSync(join(sigDir, `${asset.name}.sig`), "utf8"),
    });
  }
  const manifest = buildUpdaterManifest({
    version: parsed.version,
    notes: `${PRODUCT_LABEL[parsed.product]} ${parsed.version}`,
    pubDate: new Date().toISOString(),
    tag,
    owner,
    repo,
    files,
  });
  const manifestPath = join(sigDir, "latest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const channel = updateChannelTag(parsed.product);
  const view = spawnSync("gh", ["release", "view", channel, "--repo", ownerRepo], {
    encoding: "utf8",
  });
  if (view.status !== 0) {
    const target = process.env.GITHUB_SHA;
    if (!target) throw new Error("GITHUB_SHA is required to create the update feed.");
    gh([
      "release",
      "create",
      channel,
      "--repo",
      ownerRepo,
      "--target",
      target,
      "--latest=false",
      "--title",
      `${PRODUCT_LABEL[parsed.product]} updates`,
      "--notes",
      `Update feed for ${PRODUCT_LABEL[parsed.product]}. Installers stay on the versioned release.`,
    ]);
  }
  gh(["release", "upload", channel, manifestPath, "--repo", ownerRepo, "--clobber"]);
  console.log(`Published ${channel}/latest.json for ${tag}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
