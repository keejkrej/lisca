import { describe, expect, it, vi } from "vitest";
import { installWebMcp, type WebMcpTool } from "../src/webmcp";

function setup(product: "aligner" | "annotator" | "studio") {
  const tools = new Map<string, WebMcpTool>();
  const signals: AbortSignal[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('{"ok":true}'));
  const dispose = installWebMcp(product, {
    fetch,
    context: {
      registerTool(tool, { signal }) {
        tools.set(tool.name, tool);
        signals.push(signal);
      },
    },
  });
  return { tools, signals, fetch, dispose };
}
const execution = () => ({ signal: new AbortController().signal });

describe("WebMCP", () => {
  it("does nothing when the browser does not support WebMCP", () => {
    expect(() => installWebMcp("studio")()).not.toThrow();
  });

  it("scopes each catalog to the current product without a product selector", () => {
    const aligner = setup("aligner");
    const annotator = setup("annotator");
    const studio = setup("studio");
    expect(aligner.tools.has("align_detect_grid")).toBe(true);
    expect(aligner.tools.has("annotate_save_labels")).toBe(false);
    expect(aligner.tools.has("align_crop_roi")).toBe(false);
    expect(annotator.tools.has("studio_classify_label_free")).toBe(true);
    expect(annotator.tools.has("align_detect_grid")).toBe(false);
    expect(studio.tools.has("align_crop_roi")).toBe(true);
    for (const tool of studio.tools.values()) {
      expect(tool.inputSchema.properties).not.toHaveProperty("product");
    }
  });

  it("routes query arguments to this instance and marks calls as agent work", async () => {
    const { tools, fetch } = setup("studio");
    const tool = tools.get("fs_list_directory")!;
    const input = { path: "/a b" };
    await tool.execute(input, execution());
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toContain("%2Fa+b");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toHaveProperty("x-lisca-agent", "WebMCP agent");
    expect(init?.credentials).toBe("same-origin");
    await expect(tool.execute({ product: "aligner" }, execution())).rejects.toThrow(
      "Unknown argument",
    );
  });

  it("encodes mutation bodies and reports backend failures", async () => {
    const { tools, fetch } = setup("annotator");
    const tool = tools.get("annotate_save_labels")!;
    const input = Object.fromEntries(
      (tool.inputSchema.required as string[]).map((name) => [
        name,
        name === "labels" ? [] : "/workspace",
      ]),
    );
    await tool.execute(input, execution());
    expect(fetch.mock.calls[0][1]?.body).toBe(JSON.stringify(input));
    fetch.mockResolvedValueOnce(new Response("workspace_busy", { status: 409 }));
    await expect(tool.execute(input, execution())).rejects.toThrow("409: workspace_busy");
  });

  it("aborts tool registrations and pending requests on disposal", async () => {
    const { tools, signals, fetch, dispose } = setup("studio");
    const call = execution();
    await tools.get("fs_user_home_directory")!.execute({}, call);
    const signal = fetch.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    dispose();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(signal?.aborted).toBe(true);
  });

  it("uses desktop IPC with the agent marker when a desktop bridge exists", async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, headers: {}, body: '{"ok":true}' });
    vi.stubGlobal("window", {
      location: { href: "http://tauri.localhost/" },
      liscaDesktop: { product: "aligner", request },
    });
    try {
      const tools = new Map<string, WebMcpTool>();
      const dispose = installWebMcp("aligner", {
        context: {
          registerTool: (tool) => {
            tools.set(tool.name, tool);
          },
        },
      });
      await tools.get("fs_user_home_directory")!.execute({}, execution());
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: "/fs/home",
          headers: expect.objectContaining({ "x-lisca-agent": "WebMCP agent" }),
        }),
      );
      dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rolls back partial registration on failure", () => {
    let signal: AbortSignal | undefined;
    expect(() =>
      installWebMcp("studio", {
        context: {
          registerTool(_tool, options) {
            signal = options.signal;
            throw new Error("registration failed");
          },
        },
      }),
    ).toThrow("registration failed");
    expect(signal?.aborted).toBe(true);
  });
});
