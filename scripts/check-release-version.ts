#!/usr/bin/env node
/**
 * Verify that a Git release tag matches every release-bearing desktop manifest.
 *
 * Usage:
 *   node --experimental-strip-types scripts/check-release-version.ts v0.3.2
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DESKTOP_PRODUCTS = ["studio", "aligner", "annotator"] as const;
const SEMVER_TAG =
  /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export interface ReleaseVersionEntry {
  path: string;
  version: string;
}

export function versionFromReleaseTag(tag: string): string {
  const match = SEMVER_TAG.exec(tag);
  if (!match) {
    throw new Error(`Release tag must be valid SemVer prefixed with "v"; received "${tag}".`);
  }
  return tag.slice(1);
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

export function desktopReleaseVersions(root: string): ReleaseVersionEntry[] {
  return DESKTOP_PRODUCTS.flatMap((product) => {
    const desktopRoot = resolve(root, "apps", product, "desktop");
    const packageJson = resolve(desktopRoot, "package.json");
    const cargoToml = resolve(desktopRoot, "src-tauri", "Cargo.toml");
    const tauriConfig = resolve(desktopRoot, "src-tauri", "tauri.conf.json");
    return [
      { path: packageJson, version: readJsonVersion(packageJson) },
      { path: cargoToml, version: readCargoPackageVersion(cargoToml) },
      { path: tauriConfig, version: readJsonVersion(tauriConfig) },
    ];
  });
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
    const version = assertReleaseVersions(tag, desktopReleaseVersions(root));
    console.log(`Desktop release manifests match ${tag} (${version}).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
