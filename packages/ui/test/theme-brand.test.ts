import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ShellThemeProvider } from "../src/shell/theme/shell-theme";
import { cleanupMounted, flushMicrotasks, mountTest } from "./render-helper";

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

afterEach(async () => {
  await cleanupMounted();
  delete document.documentElement.dataset.liscaApp;
});

const ThemeScopeHost = Html.component({
  name: "ThemeScopeHost",
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    ShellThemeProvider(h, {
      props: { appId: "aligner", storageKey: "theme-brand-appid-test" },
      view: () => h.span.children("scoped"),
    }),
});

describe("per-app brand tokens", () => {
  const theme = readFileSync(resolve(packageRoot, "theme.css"), "utf8");
  const variables = readFileSync(
    resolve(packageRoot, "../design-tokens/generated/variables.css"),
    "utf8",
  );

  it("keeps GFP biological-only and distinct from Studio mint", () => {
    expect(variables).toMatch(/--instrument-gfp:\s*#10b981;/);
    expect(variables).toMatch(/--destructive:\s*#dc2626;/);
    expect(appBlock(variables, "studio")).toMatch(/--lisca-brand:\s*#3ddc97;/);
    expect(appBlock(variables, "studio")).not.toMatch(/#10b981/);
    expect(variables).not.toMatch(/\.dark\[data-lisca-app="studio"\]/);
    expect(appBlock(variables, "aligner")).toMatch(/--lisca-brand:\s*#4ea3ff;/);
    expect(variables).not.toMatch(/\.dark\[data-lisca-app="aligner"\]/);
    expect(appBlock(variables, "annotator")).toMatch(/--lisca-brand:\s*#f24b4b;/);
    expect(variables).not.toMatch(/\.dark\[data-lisca-app="annotator"\]/);
    expect(appBlock(variables, "annotator")).not.toMatch(/#dc2626/);
    expect(theme).toMatch(
      /\[data-instrument-state-toggle\]\[aria-pressed="true"\] \{\r?\n  background-color: var\(--lisca-brand/,
    );
  });

  it("sets data-lisca-app on each product document root", () => {
    const roots = [
      ["apps/studio/web/index.html", "studio"],
      ["apps/aligner/web/index.html", "aligner"],
      ["apps/annotator/web/index.html", "annotator"],
    ] as const;

    for (const [path, app] of roots) {
      expect(readRepo(path)).toContain(`data-lisca-app="${app}"`);
    }
  });

  it("scopes documentElement from ShellThemeProvider and restores on unmount", async () => {
    expect(document.documentElement.dataset.liscaApp).toBeUndefined();

    const view = await mountTest(ThemeScopeHost, {});
    await flushMicrotasks();

    expect(document.documentElement.dataset.liscaApp).toBe("aligner");
    await view.unmount();
    expect(document.documentElement.dataset.liscaApp).toBeUndefined();
  });
});
