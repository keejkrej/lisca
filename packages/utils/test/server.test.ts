import { afterEach, describe, expect, it, vi } from "vitest";

import { parseLiscaServerAddress, resolveLiscaHttpBaseUrl } from "../src/server";

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

describe("resolveLiscaHttpBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the browser origin on vite public ports", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:8765" });
    expect(resolveLiscaHttpBaseUrl({ defaultPort: 8765 })).toBe("http://localhost:8765");
  });

  it("uses the browser origin on mobile public ports", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:8083" });
    expect(resolveLiscaHttpBaseUrl({ defaultPort: 8767 })).toBe("http://localhost:8083");
  });

  it("uses the expo dev server origin when on the expo port", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:9081" });
    expect(resolveLiscaHttpBaseUrl({ defaultPort: 8765 })).toBe("http://localhost:9081");
  });

  it("ignores non-http browser protocols", () => {
    stubBrowserLocation({ protocol: "file:", host: "" });
    expect(resolveLiscaHttpBaseUrl({ defaultPort: 8765 })).toBe("http://127.0.0.1:8765");
  });

  it("prefers explicit env overrides over browser origin", () => {
    stubBrowserLocation({ protocol: "http:", host: "localhost:8765" });
    expect(
      resolveLiscaHttpBaseUrl({
        defaultPort: 8765,
        viteHttpUrl: "http://192.168.1.10:8765",
      }),
    ).toBe("http://192.168.1.10:8765");
  });
});

describe("parseLiscaServerAddress", () => {
  it("rejects websocket URLs", () => {
    expect(() => parseLiscaServerAddress("ws://192.168.1.10:8765", { defaultPort: 8765 })).toThrow(
      "http:// or https://",
    );
  });
});
