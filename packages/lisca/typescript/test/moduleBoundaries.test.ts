import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { NavigationControls, showErrorToast } from "../src/shared/react";
import {
  persistStoredString,
  readStoredStringWithFallback,
  workspaceStore,
} from "../src/shared/state";
import {
  annotationLabelsQueryOptions,
  queryKeys,
  scanRoiWorkspaceQueryOptions,
} from "../src/shared/query";
import type { ViewerDataPort } from "../src/shared/contracts";

const SRC_ROOT = join(import.meta.dir, "..", "src");
const PACKAGE_ROOT = join(import.meta.dir, "..");
const VIEWER_ROOT = join(SRC_ROOT, "viewer");
const ANNOTATOR_ROOT = join(SRC_ROOT, "annotator");
const SHARED_ROOT = join(SRC_ROOT, "shared");

function collectSourceFiles(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const nextPath = join(root, entry);
    const stats = statSync(nextPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(nextPath));
      continue;
    }
    if (nextPath.endsWith(".ts") || nextPath.endsWith(".tsx")) {
      files.push(nextPath);
    }
  }

  return files;
}

function collectForbiddenImports(root: string, forbiddenPatterns: RegExp[]): string[] {
  const violations: string[] = [];

  for (const filePath of collectSourceFiles(root)) {
    const source = readFileSync(filePath, "utf8");
    if (forbiddenPatterns.some((pattern) => pattern.test(source))) {
      violations.push(relative(SRC_ROOT, filePath));
    }
  }

  return violations.sort();
}

describe("shared package surface", () => {
  test("exports the shared shell helpers and state", () => {
    expect(typeof NavigationControls).toBe("function");
    expect(typeof showErrorToast).toBe("function");
    expect(typeof workspaceStore.getState).toBe("function");
  });
});

describe("module boundaries", () => {
  test("shared does not import viewer or annotator internals", () => {
    const violations = collectForbiddenImports(SHARED_ROOT, [
      /from\s+["'][^"']*lisca\/viewer(?:\/|["'])/,
      /from\s+["'][^"']*lisca\/annotator(?:\/|["'])/,
      /from\s+["'][^"']*\.\.\/\.\.\/viewer(?:\/|["'])/,
      /from\s+["'][^"']*\.\.\/\.\.\/annotator(?:\/|["'])/,
      /from\s+["'][^"']*\/viewer\/[^"']*["']/,
      /from\s+["'][^"']*\/annotator\/[^"']*["']/,
    ]);

    expect(violations).toEqual([]);
  });

  test("annotator only imports annotator or shared surfaces", () => {
    const violations = collectForbiddenImports(ANNOTATOR_ROOT, [
      /from\s+["'][^"']*lisca\/viewer(?:\/|["'])/,
      /from\s+["'][^"']*\/viewer\/[^"']*["']/,
    ]);

    expect(violations).toEqual([]);
  });

  test("viewer does not import annotator surfaces", () => {
    const violations = collectForbiddenImports(VIEWER_ROOT, [
      /from\s+["'][^"']*lisca\/annotator(?:\/|["'])/,
      /from\s+["'][^"']*\/annotator\/[^"']*["']/,
    ]);

    expect(violations).toEqual([]);
  });

  test("viewer ui is not a public export", () => {
    const packageJson = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8")) as {
      exports: Record<string, string>;
    };

    expect(packageJson.exports["./viewer/ui"]).toBeUndefined();
    expect(packageJson.exports["./viewer/core"]).toBeUndefined();
    expect(packageJson.exports["./viewer/contracts"]).toBeUndefined();
    expect(packageJson.exports["./shared/ui"]).toBe("./src/shared/ui/index.ts");
    expect(packageJson.exports["./shared/ui/theme.css"]).toBe("./src/shared/ui/theme.css");
  });

  test("source imports use shared core/contracts instead of legacy viewer aliases", () => {
    const violations = collectForbiddenImports(SRC_ROOT, [
      /from\s+["']lisca\/viewer\/core["']/,
      /from\s+["']lisca\/viewer\/contracts["']/,
    ]);

    expect(violations).toEqual([]);
  });

  test("viewer and annotator workspace file names are explicit", () => {
    const sourceFiles = collectSourceFiles(SRC_ROOT).map((filePath) => relative(SRC_ROOT, filePath));

    expect(sourceFiles).toContain("viewer\\react\\app\\ViewerAlignWorkspace.tsx");
    expect(sourceFiles).toContain("viewer\\react\\app\\ViewerRoiWorkspace.tsx");
    expect(sourceFiles).toContain("annotator\\react\\app\\AnnotatorWorkspace.tsx");
    expect(sourceFiles).not.toContain("viewer\\react\\app\\ViewerWorkspace.tsx");
    expect(sourceFiles).not.toContain("viewer\\react\\app\\RoiWorkspace.tsx");
  });
});

describe("shared query factories", () => {
  const backend = {} as ViewerDataPort;

  test("workspace query options reuse shared keys", () => {
    expect(scanRoiWorkspaceQueryOptions(backend, "workspace-a").queryKey).toEqual(
      queryKeys.scanRoiWorkspace("workspace-a"),
    );
    expect(annotationLabelsQueryOptions(backend, "workspace-a").queryKey).toEqual(
      queryKeys.annotationLabels("workspace-a"),
    );
  });
});

describe("shared storage helpers", () => {
  test("read and persist strings with legacy key cleanup", () => {
    const data = new Map<string, string>([["legacy", "old"]]);
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    };

    expect(readStoredStringWithFallback(storage, "current", "legacy")).toBe("old");
    persistStoredString(storage, "current", "new", "legacy");
    expect(data.get("current")).toBe("new");
    expect(data.has("legacy")).toBe(false);
    persistStoredString(storage, "current", null, "legacy");
    expect(data.has("current")).toBe(false);
  });
});
