import type {
  InferenceConnection,
  InferenceHealth,
  ReferenceSet,
  ViabilityResult,
} from "@lisca/contracts/inference";

export type { InferenceConnection, InferenceHealth, ReferenceSet, ViabilityResult };

export function inferenceUrl(value: string): string {
  const url = new URL(value.trim());
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Enter an HTTP or HTTPS server origin without a path or credentials.");
  }
  return url.origin;
}

/** Remote inference intentionally bypasses the embedded Studio HTTP/IPC backend. */
export function createInferenceClient(
  connection: InferenceConnection,
  transport: typeof fetch = globalThis.fetch,
) {
  const origin = inferenceUrl(connection.url);
  const token = connection.token.trim();
  if (!token) throw new Error("Enter the inference server token.");

  async function request<T>(path: string, init: RequestInit = {}, timeout = 600_000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("Inference request timed out.")),
      timeout,
    );
    const abort = () => controller.abort(init.signal?.reason);
    init.signal?.addEventListener("abort", abort, { once: true });
    if (init.signal?.aborted) abort();
    try {
      const response = await transport(`${origin}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
        signal: controller.signal,
        credentials: "omit",
        redirect: "error",
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
        throw new Error(
          typeof detail === "string"
            ? detail
            : `Inference server returned HTTP ${response.status}.`,
        );
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", abort);
    }
  }

  return {
    async health(signal?: AbortSignal) {
      const value = await request<InferenceHealth>("/v1/health", { signal }, 15_000);
      if (
        value.api_version !== 1 ||
        value.dimensions !== 768 ||
        typeof value.revision !== "string"
      ) {
        throw new Error("This server uses an unsupported inference protocol.");
      }
      return value;
    },
    references: (signal?: AbortSignal) =>
      request<ReferenceSet[]>("/v1/references", { signal }, 15_000),
    async addReferences(
      name: string,
      contrast: "frame" | "baseline",
      examples: { file: File; label: "viable" | "dead"; group: string }[],
      signal?: AbortSignal,
    ) {
      const encoded = await Promise.all(
        examples.map(async ({ file, label, group }) => {
          if (file.size > 2_000_000)
            throw new Error("Each reference image must be smaller than 2 MB.");
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          for (let offset = 0; offset < bytes.length; offset += 32768) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
          }
          return { image_base64: btoa(binary), label, group };
        }),
      );
      return request<ReferenceSet>("/v1/references", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contrast, examples: encoded }),
      });
    },
    async viability(
      file: File,
      options: {
        referenceSet: string;
        group: string;
        channel: number;
        z: number;
        stride: number;
        history: number;
        roiIndex?: File;
      },
      signal?: AbortSignal,
    ) {
      if (file.size > 63 * 1024 * 1024) throw new Error("Select an ROI TIFF smaller than 63 MiB.");
      const body = new FormData();
      body.set("movie", file);
      if (options.roiIndex) body.set("roi_index", options.roiIndex);
      body.set("reference_set", options.referenceSet);
      body.set("group", options.group);
      for (const key of ["channel", "z", "stride", "history"] as const)
        body.set(key, String(options[key]));
      const result = await request<ViabilityResult>("/v1/viability", {
        method: "POST",
        body,
        signal,
      });
      const length = result.frames?.length;
      if (
        !length ||
        result.viable_support?.length !== length ||
        result.smoothed_support?.length !== length ||
        result.step?.viability?.length !== length ||
        result.predictions?.length !== length ||
        !result.frames.every(Number.isFinite) ||
        !result.viable_support.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
      ) {
        throw new Error("Inference server returned an invalid trajectory.");
      }
      return result;
    },
  };
}

export function viabilityCsv(result: ViabilityResult): string {
  return (
    [
      "frame,viable_vote_support,smoothed_support,prediction,retrospective_viability",
      ...result.frames.map((frame, i) =>
        [
          frame,
          result.viable_support[i],
          result.smoothed_support[i],
          result.predictions[i],
          result.step.viability[i],
        ].join(","),
      ),
    ].join("\n") + "\n"
  );
}
