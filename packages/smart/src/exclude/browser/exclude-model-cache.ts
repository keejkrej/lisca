import { isModelCached, listCachedModelFiles } from "../../shared/transformers-cache";
import { SMART_EXCLUDE_MODEL_ID } from "./exclude-engine";

const REQUIRED_CACHE_FILES = [
  "config.json",
  "preprocessor_config.json",
  "onnx/model.onnx",
] as const;

export async function isSmartExcludeModelCached(
  modelId = SMART_EXCLUDE_MODEL_ID,
): Promise<boolean> {
  return isModelCached(modelId, REQUIRED_CACHE_FILES);
}

export async function listCachedSmartExcludeModelFiles(
  modelId = SMART_EXCLUDE_MODEL_ID,
): Promise<string[]> {
  return listCachedModelFiles(modelId, REQUIRED_CACHE_FILES);
}
