import { isModelCached, listCachedModelFiles } from "../../shared/transformers-cache";

export const SAM_MODEL_ID = "Xenova/slimsam-77-uniform";

const REQUIRED_CACHE_FILES = [
  "config.json",
  "preprocessor_config.json",
  "onnx/vision_encoder_quantized.onnx",
  "onnx/prompt_encoder_mask_decoder_quantized.onnx",
  "onnx/vision_encoder_fp16.onnx",
  "onnx/prompt_encoder_mask_decoder_fp16.onnx",
] as const;

export async function isSamModelCached(modelId = SAM_MODEL_ID): Promise<boolean> {
  return isModelCached(modelId, REQUIRED_CACHE_FILES);
}

export async function listCachedSamModelFiles(modelId = SAM_MODEL_ID): Promise<string[]> {
  return listCachedModelFiles(modelId, REQUIRED_CACHE_FILES);
}
