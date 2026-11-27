import { LabelFreeClientPort, LabelFreeReferencesPanel } from "@lisca/instrument";
import { Layer } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { studioLabelFreeClient } from "../src/components/label-free-references";
import { cleanupMounted, clickElement, mountTest, waitForCondition } from "./render-helper";

const unconfiguredHealth = {
  apiVersion: 1,
  provider: "openrouter",
  configured: false,
  modelId: "google/gemini-embedding-2",
  revision: "v1",
  dimensions: 768,
  batchSize: 32,
  cacheCap: 4096,
};

let fetchHandler: typeof fetch = async () => Response.json(unconfiguredHealth);
const fetchImpl: typeof fetch = (input, init) => fetchHandler(input, init);

function findButton(root: ParentNode, name: string): HTMLButtonElement | null {
  return (
    (Array.from(root.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === name || btn.getAttribute("aria-label") === name,
    ) as HTMLButtonElement | undefined) ?? null
  );
}

afterEach(async () => {
  await cleanupMounted();
  vi.unstubAllGlobals();
});

describe("LabelFreeReferencesPanel with the Studio client", () => {
  it("prompts for an OpenRouter API key in Settings when unconfigured", async () => {
    fetchHandler = async () => Response.json(unconfiguredHealth);
    vi.stubGlobal("fetch", fetchImpl);

    const { container } = await mountTest(
      LabelFreeReferencesPanel,
      { workspacePath: "C:/assay" },
      { layer: Layer.succeed(LabelFreeClientPort, studioLabelFreeClient) },
    );

    await waitForCondition(() =>
      /Add an OpenRouter API key in Settings/i.test(container.textContent ?? ""),
    );
    expect(findButton(container, "Build from annotations")).toBeNull();
  });

  it("builds a reference set from classification annotations when OpenRouter is configured", async () => {
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = input instanceof Request ? input.method : (init?.method ?? "GET");
      if (url.includes("/studio/label-free/health")) {
        return Response.json({
          apiVersion: 1,
          provider: "openrouter",
          configured: true,
          modelId: "google/gemini-embedding-2",
          revision: "v1",
          dimensions: 768,
          batchSize: 32,
          cacheCap: 4096,
        });
      }
      if (method === "GET" && url.includes("/studio/label-free/references"))
        return Response.json([]);
      if (method === "POST" && url.includes("/studio/label-free/references")) {
        return Response.json({
          name: "annotations",
          count: 2,
          labels: [
            { label: "dead", count: 1 },
            { label: "viable", count: 1 },
          ],
          modelId: "google/gemini-embedding-2",
          revision: "v1",
          encoderId: "google/gemini-embedding-2:v1:768",
        });
      }
      return Response.json([
        { pos: 0, roi: 3, channel: 0, time: 11, z: 0, labelId: "viable", support: 1 },
      ]);
    });
    fetchHandler = transport;
    vi.stubGlobal("fetch", fetchImpl);

    const { container } = await mountTest(
      LabelFreeReferencesPanel,
      { workspacePath: "C:/assay" },
      { layer: Layer.succeed(LabelFreeClientPort, studioLabelFreeClient) },
    );

    const build = await waitForCondition(() => findButton(container, "Build from annotations"));
    clickElement(build);

    await waitForCondition(() => /Saved 2 reference frames/i.test(container.textContent ?? ""));

    const classify = findButton(container, "Classify other ROIs");
    expect(classify).not.toBeNull();
    clickElement(classify!);

    await waitForCondition(() => /Pos0 Roi3 viable/i.test(container.textContent ?? ""));
  });
});
