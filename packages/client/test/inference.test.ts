import { describe, expect, it, vi } from "vitest";
import { createInferenceClient, inferenceUrl } from "../src/inference";

describe("inference transport", () => {
  it("rejects credential-bearing and non-HTTP server addresses", () => {
    expect(inferenceUrl(" https://spark.example/ ")).toBe("https://spark.example");
    for (const url of [
      "file:///tmp/test",
      "https://user:secret@host",
      "https://host/path",
      "https://host?token=secret",
    ]) {
      expect(() => inferenceUrl(url)).toThrow();
    }
  });

  it("uses explicit authorization, disallows redirects, and checks protocol", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ api_version: 1, dimensions: 768, revision: "abc" })),
      );
    const client = createInferenceClient(
      { url: "https://spark.example", token: "secret" },
      transport,
    );
    await client.health();
    expect(transport).toHaveBeenCalledWith(
      "https://spark.example/v1/health",
      expect.objectContaining({
        credentials: "omit",
        redirect: "error",
        headers: { Authorization: "Bearer secret" },
      }),
    );
    transport.mockResolvedValue(new Response(JSON.stringify({ api_version: 2 })));
    await expect(client.health()).rejects.toThrow("unsupported inference protocol");
  });

  it("reports busy errors without retrying an upload silently", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ detail: "Queue full" }), { status: 503 }));
    const client = createInferenceClient({ url: "http://spark:8910", token: "secret" }, transport);
    await expect(client.references()).rejects.toThrow("Queue full");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("passes cancellation to the transport", async () => {
    const controller = new AbortController();
    controller.abort();
    const transport = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      expect(init?.signal?.aborted).toBe(true);
      throw new DOMException("Cancelled", "AbortError");
    });
    const client = createInferenceClient({ url: "http://spark:8910", token: "secret" }, transport);
    await expect(client.health(controller.signal)).rejects.toThrow("Cancelled");
  });
});
