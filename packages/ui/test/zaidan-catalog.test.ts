import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const catalogModules = [
  "accordion",
  "alert",
  "alert-dialog",
  "aspect-ratio",
  "attachment",
  "avatar",
  "badge",
  "breadcrumb",
  "bubble",
  "button",
  "button-group",
  "calendar",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "collapsible",
  "combobox",
  "command",
  "context-menu",
  "dialog",
  "drawer",
  "dropdown-menu",
  "empty",
  "field",
  "hover-card",
  "icon-stack",
  "input",
  "input-group",
  "input-otp",
  "item",
  "kbd",
  "label",
  "marker",
  "menubar",
  "message",
  "native-select",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "toggle-group",
  "tooltip",
] as const;

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const uiDirectory = resolve(packageRoot, "src/components/ui");

describe("Zaidan Maia catalog", () => {
  it("keeps the complete registry snapshot public", () => {
    const installedModules = readdirSync(uiDirectory)
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => file.slice(0, -4))
      .sort();
    expect(installedModules).toEqual([...catalogModules].sort());

    const barrel = readFileSync(resolve(uiDirectory, "index.ts"), "utf8");
    for (const moduleName of catalogModules) {
      expect(barrel).toContain(`from "./${moduleName}"`);
    }
  });

  it("uses package-local imports that remain resolvable for consumers", () => {
    const componentSource = catalogModules
      .map((moduleName) => readFileSync(resolve(uiDirectory, `${moduleName}.tsx`), "utf8"))
      .join("\n");
    expect(componentSource).not.toContain('from "@/');

    const config = JSON.parse(readFileSync(resolve(packageRoot, "components.json"), "utf8")) as {
      aliases: Record<string, string>;
    };
    expect(config.aliases).toMatchObject({
      components: "#components",
      hooks: "#hooks",
      lib: "#lib",
      ui: "#ui",
      utils: "#lib/utils",
    });
  });
});
