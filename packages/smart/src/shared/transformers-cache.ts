const TRANSFORMERS_CACHE_NAME = "transformers-cache";

export function remoteModelUrl(modelId: string, filename: string, revision = "main"): string {
  if (modelId.startsWith("/") || modelId.startsWith("http://") || modelId.startsWith("https://")) {
    const base = modelId.endsWith("/") ? modelId.slice(0, -1) : modelId;
    return `${base}/${filename}`;
  }
  return `https://huggingface.co/${modelId}/resolve/${encodeURIComponent(revision)}/${filename}`;
}

export async function openTransformersCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(TRANSFORMERS_CACHE_NAME);
  } catch {
    return null;
  }
}

export async function isModelCached(
  modelId: string,
  requiredFiles: readonly string[],
): Promise<boolean> {
  const cache = await openTransformersCache();
  if (!cache) return false;

  try {
    const matches = await Promise.all(
      requiredFiles.map((file) => cache.match(remoteModelUrl(modelId, file))),
    );
    return matches.every(Boolean);
  } catch {
    return false;
  }
}

export async function listCachedModelFiles(
  modelId: string,
  requiredFiles: readonly string[],
): Promise<string[]> {
  const cache = await openTransformersCache();
  if (!cache) return [];

  const hits: string[] = [];
  const matches = await Promise.all(
    requiredFiles.map((file) => cache.match(remoteModelUrl(modelId, file))),
  );
  for (let index = 0; index < requiredFiles.length; index += 1) {
    if (matches[index]) hits.push(requiredFiles[index]!);
  }
  return hits;
}
