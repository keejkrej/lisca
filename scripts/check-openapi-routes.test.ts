import { describe, expect, it } from "vite-plus/test";
import { findRouteMismatch, hasRouteMismatch, RAW_BYTE_ROUTES } from "./check-openapi-routes.ts";

describe("openapi route checker", () => {
  it("locks /fs/file as the single raw byte exception", () => {
    expect([...RAW_BYTE_ROUTES]).toEqual(["/fs/file"]);
  });

  it("accepts the allowed state: matching JSON routes, /fs/file only in Rust", () => {
    const openapiPaths = new Set(["/align/load-frame", "/fs/read-text"]);
    const rustPaths = new Set(["/align/load-frame", "/fs/read-text", "/fs/file"]);
    const mismatch = findRouteMismatch(openapiPaths, rustPaths);
    expect(mismatch).toEqual({
      missingInRust: [],
      missingInOpenApi: [],
      missingRawRoutes: [],
      rawRoutesInOpenApi: [],
    });
    expect(hasRouteMismatch(mismatch)).toBe(false);
  });

  it("fails when /fs/file disappears from Rust routes", () => {
    const openapiPaths = new Set(["/align/load-frame"]);
    const rustPaths = new Set(["/align/load-frame"]);
    const mismatch = findRouteMismatch(openapiPaths, rustPaths);
    expect(mismatch.missingRawRoutes).toEqual(["/fs/file"]);
    expect(hasRouteMismatch(mismatch)).toBe(true);
  });

  it("fails when /fs/file reappears in openapi.json", () => {
    const openapiPaths = new Set(["/align/load-frame", "/fs/file"]);
    const rustPaths = new Set(["/align/load-frame", "/fs/file"]);
    const mismatch = findRouteMismatch(openapiPaths, rustPaths);
    expect(mismatch.rawRoutesInOpenApi).toEqual(["/fs/file"]);
    expect(hasRouteMismatch(mismatch)).toBe(true);
  });

  it("fails on JSON route drift in either direction", () => {
    const openapiPaths = new Set(["/align/load-frame"]);
    const rustPaths = new Set(["/annotate/save"]);
    const mismatch = findRouteMismatch(openapiPaths, rustPaths);
    expect(mismatch.missingInRust).toEqual(["/align/load-frame"]);
    expect(mismatch.missingInOpenApi).toEqual(["/annotate/save"]);
    expect(hasRouteMismatch(mismatch)).toBe(true);
  });
});
