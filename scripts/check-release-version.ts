#!/usr/bin/env node
/**
 * Verify that a Git release tag matches every release-bearing desktop manifest.
 *
 * Usage:
 *   node --experimental-strip-types scripts/check-release-version.ts v0.4.9
 *   node --experimental-strip-types scripts/check-release-version.ts aligner-v0.4.7
 *   node --experimental-strip-types scripts/check-release-version.ts annotator-v0.4.7
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DESKTOP_PRODUCTS = ["studio", "aligner", "annotator"] as const;
const SEMVER =
  /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?/;

export type DesktopProduct = (typeof DESKTOP_PRODUCTS)[number];

export interface ParsedReleaseTag {
  product: DesktopProduct;
  version: string;
}

export interface ReleaseVersionEntry {
  path: string;
  version: string;
}

function releaseTagPattern(): RegExp {
  return new RegExp(`^(?:(?<product>aligner|annotator|studio)-)?v${SEMVER.source}$`);
}

export function parseReleaseTag(tag: string): ParsedReleaseTag {
  const match = releaseTagPattern().exec(tag);
  if (!match?.groups) {
    throw new Error(
      `Release tag must be valid SemVer prefixed with "v" (vX.Y.Z, studio-vX.Y.Z, aligner-vX.Y.Z, or annotator-vX.Y.Z); received "${tag}".`,
    );
  }
  const product = (match.groups.product ?? "studio") as DesktopProduct;
  const version = tag.startsWith("v") ? tag.slice(1) : tag.slice(tag.indexOf("-v") + 2);
  return { product, version };
}

export function versionFromReleaseTag(tag: string): string {
  return parseReleaseTag(tag).version;
}

function readJsonVersion(path: string): string {
  const contents = JSON.parse(readFileSync(path, "utf8")) as { version?: unknown };
  if (typeof contents.version !== "string") {
    throw new Error(`Missing string version in ${path}.`);
  }
  return contents.version;
}

function readCargoPackageVersion(path: string): string {
  const contents = readFileSync(path, "utf8");
  const packageStart = contents.indexOf("[package]");
  const afterPackageHeader =
    packageStart >= 0 ? contents.slice(packageStart + "[package]".length) : "";
  const nextSection = afterPackageHeader.search(/^\[[^\]]+\]\s*$/m);
  const packageSection =
    nextSection >= 0 ? afterPackageHeader.slice(0, nextSection) : afterPackageHeader;
  const version = packageSection
    ? /^version\s*=\s*"([^"]+)"\s*$/m.exec(packageSection)?.[1]
    : undefined;
  if (!version) {
    throw new Error(`Missing [package] version in ${path}.`);
  }
  return version;
}

export function desktopReleaseVersions(
  root: string,
  product: DesktopProduct = "studio",
): ReleaseVersionEntry[] {
  const desktopRoot = resolve(root, "apps", product, "desktop");
  const packageJson = resolve(desktopRoot, "package.json");
  const cargoToml = resolve(desktopRoot, "src-tauri", "Cargo.toml");
  const tauriConfig = resolve(desktopRoot, "src-tauri", "tauri.conf.json");
  return [
    { path: packageJson, version: readJsonVersion(packageJson) },
    { path: cargoToml, version: readCargoPackageVersion(cargoToml) },
    { path: tauriConfig, version: readJsonVersion(tauriConfig) },
  ];
}

export function assertReleaseVersions(tag: string, entries: ReleaseVersionEntry[]): string {
  const expected = versionFromReleaseTag(tag);
  const mismatches = entries.filter((entry) => entry.version !== expected);
  if (mismatches.length > 0) {
    const details = mismatches.map((entry) => `  ${entry.path}: ${entry.version}`).join("\n");
    throw new Error(`Release ${tag} requires desktop version ${expected}; mismatches:\n${details}`);
  }
  return expected;
}

function main(): void {
  const tag = process.argv[2];
  if (!tag) {
    console.error("Usage: check-release-version.ts v<major>.<minor>.<patch>");
    process.exit(2);
  }

  const root = resolve(import.meta.dirname, "..");
  try {
    const parsed = parseReleaseTag(tag);
    const version = assertReleaseVersions(tag, desktopReleaseVersions(root, parsed.product));
    console.log(`${parsed.product} release manifests match ${tag} (${version}).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
