import path from "node:path";
import { describe, expect, it } from "vite-plus/test";

import { FIXTURE_ASSAYS, FIXTURE_STAGES } from "../packages/fixtures/src/materialize.ts";
import {
  defaultStudioMockOut,
  parseStudioMockArgs,
  STUDIO_MOCK_ASSAYS,
  STUDIO_MOCK_STAGES,
} from "./dev-studio-mock.ts";

const repoRoot = path.resolve(import.meta.dirname, "..");

describe("studio browser mock args", () => {
  it("defaults to an analyzed transfection workspace that is replaced each run", () => {
    const parsed = parseStudioMockArgs([], repoRoot);
    expect(parsed).toEqual({
      ok: true,
      assay: "transfection",
      stage: "analyzed",
      out: defaultStudioMockOut(repoRoot),
      force: true,
    });
  });

  it("leaves a custom directory alone unless --force is set", () => {
    expect(parseStudioMockArgs(["--out", "custom-ws"], repoRoot)).toMatchObject({
      ok: true,
      out: path.resolve("custom-ws"),
      force: false,
    });
    expect(parseStudioMockArgs(["--out", "custom-ws", "--force"], repoRoot)).toMatchObject({
      force: true,
    });
  });

  it("accepts the other shipping assay and an earlier workspace stage", () => {
    expect(
      parseStudioMockArgs(["--assay", "killing-death-reporter", "--stage", "cropped"], repoRoot),
    ).toMatchObject({ ok: true, assay: "killing-death-reporter", stage: "cropped" });
  });

  it("rejects the source stage because it has no assay.json", () => {
    const parsed = parseStudioMockArgs(["--stage", "source"], repoRoot);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/not a workspace/);
  });

  it("rejects an unknown assay", () => {
    const parsed = parseStudioMockArgs(["--assay", "landing"], repoRoot);
    expect(parsed.ok).toBe(false);
  });

  it("stays aligned with the fixture generator", () => {
    expect([...STUDIO_MOCK_ASSAYS]).toEqual([...FIXTURE_ASSAYS]);
    expect(["source", ...STUDIO_MOCK_STAGES]).toEqual([...FIXTURE_STAGES]);
  });

  it("serves mock mode on the mock ports and dev mode on the studio ports", async () => {
    const { default: studioViteConfig } = await import("../apps/studio/web/vite.config.ts");
    const mock = studioViteConfig({ mode: "mock" });
    const dev = studioViteConfig({ mode: "development" });
    expect(mock.server?.port).toBe(18777);
    expect(mock.server?.strictPort).toBe(true);
    expect(mock.server?.open).toBe(true);
    expect(mock.server?.proxy?.["/fs"]).toMatchObject({ target: "http://127.0.0.1:19777" });
    expect(dev.server?.port).toBe(18767);
    expect(dev.server?.strictPort).toBe(false);
    expect(dev.server?.open).toBe(false);
    expect(dev.server?.proxy?.["/studio"]).toMatchObject({ target: "http://127.0.0.1:19767" });
  });
});
