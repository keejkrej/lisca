import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createHostPort } from "../src/ports/host";
import {
  createDesktopFetch,
  resolveLiscaAssetUrl,
  type LiscaDesktopBridge,
} from "../src/infra/desktop";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("desktop IPC transport", () => {
  it("maps Fetch requests and responses onto the Tauri bridge", async () => {
    const request = vi.fn(async () => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transport: "ipc" }),
    }));
    const bridge: LiscaDesktopBridge = { product: "studio", request };

    const response = await createDesktopFetch(bridge)("http://127.0.0.1:8767/studio/test?q=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: 42 }),
    });

    expect(request).toHaveBeenCalledWith({
      method: "POST",
      uri: "/studio/test?q=1",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: 42 }),
    });
    await expect(response.json()).resolves.toEqual({ transport: "ipc" });
  });

  it("decodes binary IPC responses for Fetch consumers", async () => {
    const bridge: LiscaDesktopBridge = {
      product: "studio",
      request: async () => ({
        status: 200,
        headers: { "content-type": "application/octet-stream" },
        bodyBase64: "AJ+Slg==",
      }),
    };

    const response = await createDesktopFetch(bridge)("http://127.0.0.1:8767/fs/file?path=x");

    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([0, 159, 146, 150]);
  });

  it("preserves Fetch cancellation while an IPC command is in flight", async () => {
    const bridge: LiscaDesktopBridge = {
      product: "studio",
      request: () => new Promise(() => undefined),
    };
    const controller = new AbortController();
    const response = createDesktopFetch(bridge)("http://127.0.0.1:8767/fs/home", {
      signal: controller.signal,
    });

    controller.abort();

    await expect(response).rejects.toMatchObject({ name: "AbortError" });
  });

  it("selects IPC automatically for generated API clients", async () => {
    const request = vi.fn(async () => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "/home/test" }),
    }));
    vi.stubGlobal("window", {
      liscaDesktop: { product: "studio", request },
      location: { href: "tauri://localhost/index.html" },
    });
    const port = createHostPort({ baseUrl: () => "http://127.0.0.1:8767" });

    await expect(Effect.runPromise(port.userHomeDirectory())).resolves.toBe("/home/test");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        uri: "/fs/home",
        body: undefined,
      }),
    );
  });

  it("turns backend files into renderer-safe data URLs", async () => {
    const bridge: LiscaDesktopBridge = {
      product: "studio",
      request: async () => ({
        status: 200,
        headers: { "content-type": "image/png" },
        bodyBase64: "iVBORw==",
      }),
    };
    vi.stubGlobal("window", {
      liscaDesktop: bridge,
      location: { href: "tauri://localhost/index.html" },
    });

    await expect(resolveLiscaAssetUrl("http://127.0.0.1:8767/fs/file?path=plot.png")).resolves.toBe(
      "data:image/png;base64,iVBORw==",
    );
  });
});
