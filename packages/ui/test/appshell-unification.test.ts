// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("AppShell unification", () => {
  it("does not expose a variant API", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../src/shell/layout/shell.tsx", import.meta.url)),
      "utf8",
    );
    expect(source).not.toMatch(/AppShellVariant/);
    expect(source).not.toMatch(/data-variant/);
    expect(source).not.toMatch(/variant\?:/);
  });
});
