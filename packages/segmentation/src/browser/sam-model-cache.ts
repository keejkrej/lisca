export const SAM_MODEL_ID = "Xenova/slimsam-77-uniform";

const REQUIRED_CACHE_FILES = [
  "config.json",
  "preprocessor_config.json",
  "onnx/vision_encoder_quantized.onnx",
  "onnx/prompt_encoder_mask_decoder_quantized.onnx",
  "onnx/vision_encoder_fp16.onnx",
  "onnx/prompt_encoder_mask_decoder_fp16.onnx",
] as const;

function remoteModelUrl(modelId: string, filename: string, revision = "main"): string {
  return `https://huggingface.co/${modelId}/resolve/${encodeURIComponent(revision)}/${filename}`;
}

export async function isSamModelCached(modelId = SAM_MODEL_ID): Promise<boolean> {
  if (typeof caches === "undefined") return false;

  try {
    const cache = await caches.open("transformers-cache");
    const hasConfig = Boolean(await cache.match(remoteModelUrl(modelId, "config.json")));
    const hasPreprocessor = Boolean(
      await cache.match(remoteModelUrl(modelId, "preprocessor_config.json")),
    );
    const hasWasmBundle =
      Boolean(await cache.match(remoteModelUrl(modelId, "onnx/vision_encoder_quantized.onnx"))) &&
      Boolean(
        await cache.match(remoteModelUrl(modelId, "onnx/prompt_encoder_mask_decoder_quantized.onnx")),
      );
    const hasWebGpuBundle =
      Boolean(await cache.match(remoteModelUrl(modelId, "onnx/vision_encoder_fp16.onnx"))) &&
      Boolean(
        await cache.match(remoteModelUrl(modelId, "onnx/prompt_encoder_mask_decoder_fp16.onnx")),
      );

    return hasConfig && hasPreprocessor && (hasWasmBundle || hasWebGpuBundle);
  } catch {
    return false;
  }
}

export async function listCachedSamModelFiles(modelId = SAM_MODEL_ID): Promise<string[]> {
  if (typeof caches === "undefined") return [];
  const cache = await caches.open("transformers-cache");
  const hits: string[] = [];
  const matches = await Promise.all(
    REQUIRED_CACHE_FILES.map((file) => cache.match(remoteModelUrl(modelId, file))),
  );
  for (let index = 0; index < REQUIRED_CACHE_FILES.length; index += 1) {
    if (matches[index]) hits.push(REQUIRED_CACHE_FILES[index]!);
  }
  return hits;
}
