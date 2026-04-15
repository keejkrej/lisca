import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { NavigationControls, showErrorToast } from "../src/shared/react";
import { workspaceStore } from "../src/shared/state";

const SRC_ROOT = join(import.meta.dir, "..", "src");
const VIEWER_ROOT = join(SRC_ROOT, "viewer");
const ANNOTATOR_ROOT = join(SRC_ROOT, "annotator");

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
});
