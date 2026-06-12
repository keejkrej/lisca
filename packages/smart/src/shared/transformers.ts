export type TransformersModule = typeof import("@huggingface/transformers");

let transformersModule: TransformersModule | null = null;

export async function loadTransformers(): Promise<TransformersModule> {
  if (!transformersModule) {
    transformersModule = await import("@huggingface/transformers");
  }
  return transformersModule;
}
