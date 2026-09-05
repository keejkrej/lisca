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

describe("resolveLiscaHttpBaseUrl — liscaHttp query override", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not throw on a query that single-decodes to a stray percent", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://host:8765/stats/50%off");
    expect(() => resolveLiscaHttpBaseUrl({ searchParams, defaultPort: 8765 })).not.toThrow();
  });

  it("returns the value verbatim when it contains a stray percent", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://host:8765/stats/50%off");
    expect(resolveLiscaHttpBaseUrl({ searchParams, defaultPort: 8765 })).toBe(
      "http://host:8765/stats/50%off",
    );
  });

  it("returns a plain origin verbatim (no percent encoding)", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://192.168.1.10:8765");
    expect(resolveLiscaHttpBaseUrl({ searchParams, defaultPort: 8765 })).toBe(
      "http://192.168.1.10:8765",
    );
  });

  it("decodes a single-encoded value exactly once (no double decode)", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://host:8765/api%2Fv2");
    expect(resolveLiscaHttpBaseUrl({ searchParams, defaultPort: 8765 })).toBe(
      "http://host:8765/api/v2",
    );
  });

  it("decodes an encoded percent exactly once to a literal percent", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://host:8765/stats/50%25off");
    expect(resolveLiscaHttpBaseUrl({ searchParams, defaultPort: 8765 })).toBe(
      "http://host:8765/stats/50%off",
    );
  });

  it("decodes encoded spaces exactly once", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://host:8765/path%20with%20space");
    expect(resolveLiscaHttpBaseUrl({ searchParams, defaultPort: 8765 })).toBe(
      "http://host:8765/path with space",
    );
  });

  it("trims surrounding whitespace from the decoded value", () => {
    const searchParams = new URLSearchParams("liscaHttp=%20%20http://host:8765%20%20");
    expect(resolveLiscaHttpBaseUrl({ searchParams, defaultPort: 8765 })).toBe("http://host:8765");
  });

  it("takes precedence over viteHttpUrl", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://override:9999");
    expect(
      resolveLiscaHttpBaseUrl({
        searchParams,
        defaultPort: 8765,
        viteHttpUrl: "http://192.168.1.10:8765",
        activeAddress: null,
      }),
    ).toBe("http://override:9999");
  });

  it("takes precedence over the session active server", () => {
    const searchParams = new URLSearchParams("liscaHttp=http://override:9999");
    expect(
      resolveLiscaHttpBaseUrl({
        searchParams,
        defaultPort: 8765,
        activeAddress: "192.168.1.10:8765",
      }),
    ).toBe("http://override:9999");
  });

  it("falls through to viteHttpUrl when liscaHttp is empty", () => {
    const searchParams = new URLSearchParams("liscaHttp=");
    expect(
      resolveLiscaHttpBaseUrl({
        searchParams,
        defaultPort: 8765,
        viteHttpUrl: "http://192.168.1.10:8765",
        activeAddress: null,
      }),
    ).toBe("http://192.168.1.10:8765");
  });

  it("falls through to viteHttpUrl when liscaHttp is only whitespace", () => {
    const searchParams = new URLSearchParams("liscaHttp=%20%20");
    expect(
      resolveLiscaHttpBaseUrl({
        searchParams,
        defaultPort: 8765,
        viteHttpUrl: "http://192.168.1.10:8765",
        activeAddress: null,
      }),
    ).toBe("http://192.168.1.10:8765");
  });

  it("falls through when no liscaHttp key is present", () => {
    const searchParams = new URLSearchParams("other=value");
    expect(
      resolveLiscaHttpBaseUrl({
        searchParams,
        defaultPort: 8765,
        viteHttpUrl: "http://192.168.1.10:8765",
        activeAddress: null,
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
