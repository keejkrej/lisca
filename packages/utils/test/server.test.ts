import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveLiscaHttpBaseUrl, resolveLiscaWsUrl } from "../src/server";

function stubBrowserLocation(location: {
  protocol: string;
  host: string;
  port?: string;
  search?: string;
}) {
  vi.stubGlobal("window", {
    location: {
      protocol: location.protocol,
      host: location.host,
      hostname: location.host.split(":")[0] ?? location.host,
      port: location.port ?? location.host.split(":")[1] ?? "",
      search: location.search ?? "",
    },
  });
}

describe("resolveLiscaWsUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the browser origin on vite public ports", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:8765" });
    expect(resolveLiscaWsUrl({ defaultPort: 8765 })).toBe("ws://localhost:8765/ws");
  });

  it("uses the browser origin on mobile public ports", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:8083" });
    expect(resolveLiscaWsUrl({ defaultPort: 8767 })).toBe("ws://localhost:8083/ws");
    expect(resolveLiscaHttpBaseUrl({ defaultPort: 8767 })).toBe("http://localhost:8083");
  });

  it("routes websocket traffic to rust when on the expo dev server port", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:9081" });
    expect(resolveLiscaWsUrl({ defaultPort: 8765 })).toBe("ws://localhost:8765/ws");
    expect(resolveLiscaHttpBaseUrl({ defaultPort: 8765 })).toBe("http://localhost:9081");
  });

  it("ignores non-http browser protocols", () => {
    stubBrowserLocation({ protocol: "file:", host: "" });
    expect(resolveLiscaWsUrl({ defaultPort: 8765 })).toBe("ws://127.0.0.1:8765/ws");
  });

  it("prefers explicit env overrides over browser origin", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:8765" });
    expect(
      resolveLiscaWsUrl({
        defaultPort: 8765,
        viteWsUrl: "ws://192.168.1.10:8765/ws",
      }),
    ).toBe("ws://192.168.1.10:8765/ws");
  });
});
