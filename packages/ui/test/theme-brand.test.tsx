import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { ShellThemeProvider } from "../src/shell/theme/shell-theme";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");

function readRepo(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

function appBlock(theme: string, app: "studio" | "aligner" | "annotator") {
  const match = theme.match(new RegExp(`\\[data-lisca-app="${app}"\\] \\{([\\s\\S]*?)\\n\\}`));
  expect(match, `missing [data-lisca-app="${app}"] block`).not.toBeNull();
  return match![1];
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.liscaApp;
});

describe("per-app brand tokens", () => {
  const theme = readFileSync(resolve(packageRoot, "theme.css"), "utf8");

  it("keeps GFP biological-only and distinct from Studio mint", () => {
    expect(theme).toMatch(/--instrument-gfp:\s*#10b981;/);
    expect(theme).toMatch(/--destructive:\s*#dc2626;/);
    expect(appBlock(theme, "studio")).toMatch(/--lisca-brand:\s*#3ddc97;/);
    expect(appBlock(theme, "studio")).not.toMatch(/#10b981/);
    expect(appBlock(theme, "aligner")).toMatch(/--lisca-brand:\s*#4ea3ff;/);
    expect(appBlock(theme, "annotator")).toMatch(/--lisca-brand:\s*#f24b4b;/);
    expect(appBlock(theme, "annotator")).not.toMatch(/#dc2626/);
    expect(theme).toMatch(
      /\[data-instrument-state-toggle\]\[aria-pressed="true"\] \{\n  background-color: var\(--lisca-brand/,
    );
  });

  it("sets data-lisca-app on each product document root and leaves landing unscoped", () => {
    const roots = [
      ["apps/studio/web/index.html", "studio"],
      ["apps/studio/demo/index.html", "studio"],
      ["apps/aligner/web/index.html", "aligner"],
      ["apps/aligner/demo/index.html", "aligner"],
      ["apps/annotator/web/index.html", "annotator"],
      ["apps/annotator/demo/index.html", "annotator"],
    ] as const;

    for (const [path, app] of roots) {
      expect(readRepo(path)).toContain(`data-lisca-app="${app}"`);
    }

    expect(readRepo("apps/landing/web/index.html")).not.toContain("data-lisca-app");
    expect(readRepo("packages/web-app/src/create-lisca-web-app.tsx")).toMatch(
      /<ShellThemeProvider appId=\{appId\}>/,
    );
  });

  it("scopes documentElement from ShellThemeProvider and restores on unmount", () => {
    expect(document.documentElement.dataset.liscaApp).toBeUndefined();

    const view = render(() => (
      <ShellThemeProvider appId="aligner" storageKey="theme-brand-appid-test">
        <span>scoped</span>
      </ShellThemeProvider>
    ));

    expect(document.documentElement.dataset.liscaApp).toBe("aligner");
    view.unmount();
    expect(document.documentElement.dataset.liscaApp).toBeUndefined();
  });
});
