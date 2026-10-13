import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createDesktopFetch, type LiscaDesktopBridge } from "../src/infra/desktop";
import { runClientEffect } from "../src/infra/runtime";
import { createStudioPort } from "../src/ports/studio";

const lightHealth = {
  apiVersion: 1,
  runtime: "embedded",
  build: "light",
  cudaBundled: false,
  modelId: null,
  revision: null,
  dimensions: null,
  device: null,
  batchSize: 0,
  queueDepth: 0,
  cacheCap: 0,
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
  it("asks the Studio API for the build over fetch when no desktop bridge is injected", async () => {
    withOrigin();
    const fetchMock = vi.fn(async () => Response.json(lightHealth));
    const port = createStudioPort({ fetch: fetchMock });
    const health = await runClientEffect(port.labelFreeHealth());
    expect(health.build).toBe("light");
    const input = fetchMock.mock.calls[0]?.[0];
    const url = input instanceof Request ? input.url : String(input);
    expect(url).toContain("/studio/label-free/health");
  });

  it("sends label-free calls through the desktop IPC bridge", async () => {
    withOrigin();
    const request = vi.fn(async () => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lightHealth),
    }));
    const bridge: LiscaDesktopBridge = { product: "studio", request };
    const fetchMock = vi.fn();
    const port = createStudioPort({ fetch: createDesktopFetch(bridge) });
    const health = await runClientEffect(port.labelFreeHealth());
    expect(health.build).toBe("light");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        uri: "/studio/label-free/health",
      }),
    );
  });
});
