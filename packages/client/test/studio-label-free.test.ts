import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createDesktopFetch, type LiscaDesktopBridge } from "../src/infra/desktop";
import { runClientEffect } from "../src/infra/runtime";
import { createStudioPort } from "../src/ports/studio";

const openRouterHealth = {
  apiVersion: 1,
  provider: "openrouter",
  configured: false,
  modelId: "google/gemini-embedding-2",
  revision: "v1",
  dimensions: 768,
  batchSize: 32,
  cacheCap: 4096,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function withOrigin() {
  vi.stubGlobal("location", {
    origin: "http://127.0.0.1:18767",
    pathname: "/",
  });
}

describe("studio label-free transport", () => {
  it("asks the Studio API for OpenRouter health over fetch when no desktop bridge is injected", async () => {
    withOrigin();
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(openRouterHealth));
    const port = createStudioPort({ fetch: fetchMock });
    const health = await runClientEffect(port.labelFreeHealth());
    expect(health.provider).toBe("openrouter");
    expect(health.modelId).toBe("google/gemini-embedding-2");
    const input = fetchMock.mock.calls[0]?.[0];
    const url = input instanceof Request ? input.url : String(input);
    expect(url).toContain("/studio/label-free/health");
  });

  it("sends label-free health and key calls through the desktop IPC bridge", async () => {
    withOrigin();
    const request = vi.fn(async () => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...openRouterHealth, configured: true }),
    }));
    const bridge: LiscaDesktopBridge = { product: "studio", request };
    const fetchMock = vi.fn<typeof fetch>();
    const port = createStudioPort({ fetch: createDesktopFetch(bridge) });
    const health = await runClientEffect(port.saveLabelFreeKey("sk-or-v1-test"));
    expect(health.provider).toBe("openrouter");
    expect(health.configured).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        uri: "/studio/label-free/key",
      }),
    );
  });
});
