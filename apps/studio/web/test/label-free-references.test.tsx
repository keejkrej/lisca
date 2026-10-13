import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { LabelFreeReferences } from "../src/components/label-free-references";

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

let fetchHandler: typeof fetch = async () => Response.json(lightHealth);
const fetchImpl: typeof fetch = (input, init) => fetchHandler(input, init);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LabelFreeReferences", () => {
  it("explains the light fluorescence build", async () => {
    fetchHandler = async () => Response.json(lightHealth);
    vi.stubGlobal("fetch", fetchImpl);
    render(() => <LabelFreeReferences workspacePath="C:/assay" />);
    expect(await screen.findByText(/light build runs fluorescence assays/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Build from annotations" })).toBeNull();
  });

  it("builds a reference set from classification annotations", async () => {
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = input instanceof Request ? input.method : (init?.method ?? "GET");
      if (url.includes("/studio/label-free/health")) {
        return Response.json({
          apiVersion: 1,
          runtime: "embedded",
          build: "label-free",
          cudaBundled: false,
          modelId: "cpu-microscopy",
          revision: "v1",
          dimensions: 43,
          device: "cpu",
          batchSize: 32,
          queueDepth: 0,
          cacheCap: 4096,
        });
      }
      if (method === "GET" && url.includes("/studio/label-free/references")) return Response.json([]);
      if (method === "POST" && url.includes("/studio/label-free/references")) {
        return Response.json({
          name: "annotations",
          count: 2,
          labels: [
            { label: "dead", count: 1 },
            { label: "viable", count: 1 },
          ],
          modelId: "cpu-microscopy",
          revision: "v1",
          encoderId: "cpu-microscopy-v1",
        });
      }
      return Response.json([
        { pos: 0, roi: 3, channel: 0, time: 0, z: 0, labelId: "viable", support: 1 },
      ]);
    });
    fetchHandler = transport;
    vi.stubGlobal("fetch", fetchImpl);
    render(() => <LabelFreeReferences workspacePath="C:/assay" />);
    const build = await screen.findByRole("button", { name: "Build from annotations" });
    fireEvent.click(build);
    expect(await screen.findByText(/Saved 2 reference frames/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Classify other ROIs" }));
    expect(await screen.findByText(/Pos0 Roi3 viable/i)).toBeTruthy();
  });
});
