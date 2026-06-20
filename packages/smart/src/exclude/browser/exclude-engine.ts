import { loadTransformers } from "../../shared/transformers";
import type { SmartExcludeDownloadProgress } from "../types";

export const SMART_EXCLUDE_MODEL_ID = "keejkrej/smart-exclusion-resnet18";
export const SMART_EXCLUDE_IMAGE_SIZE = 224;

type ProgressInfo =
  | { status: "initiate" | "download"; name: string; file: string }
  | {
      status: "progress";
      name: string;
      file: string;
      progress: number;
      loaded: number;
      total: number;
    }
  | { status: "done"; name: string; file: string }
  | { status: "ready"; task: string; model: string };

type ClassificationOutput = Array<{ label: string; score: number }>;

type ImageClassifier = (image: unknown) => Promise<ClassificationOutput>;

function createProgressCallback(onProgress?: (progress: SmartExcludeDownloadProgress) => void) {
  if (!onProgress) return undefined;
  return (info: ProgressInfo) => {
    if (info.status === "progress") {
      onProgress({
        progress: info.progress,
        message: `Loading ${info.file}`,
        file: info.file,
      });
      return;
    }
    if (info.status === "initiate" || info.status === "download") {
      onProgress({
        progress: 0,
        message: `Fetching ${info.file}`,
        file: info.file,
      });
      return;
    }
    if (info.status === "done") {
      onProgress({
        progress: 100,
        message: `Loaded ${info.file}`,
        file: info.file,
      });
    }
  };
}

let classifierPromise: Promise<ImageClassifier> | null = null;
let classifierLoaded = false;

export async function getSmartExcludeClassifier(
  onProgress?: (progress: SmartExcludeDownloadProgress) => void,
): Promise<ImageClassifier> {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline } = await loadTransformers();
      const createClassifier = pipeline as (
        task: "image-classification",
        model: string,
        options?: { device?: string; progress_callback?: (info: ProgressInfo) => void },
      ) => Promise<ImageClassifier>;
      const progress_callback = createProgressCallback(onProgress);
      try {
        const classifier = await createClassifier("image-classification", SMART_EXCLUDE_MODEL_ID, {
          device: "webgpu",
          progress_callback,
        });
        classifierLoaded = true;
        return classifier;
      } catch {
        const classifier = await createClassifier("image-classification", SMART_EXCLUDE_MODEL_ID, {
          device: "wasm",
          progress_callback,
        });
        classifierLoaded = true;
        return classifier;
      }
    })();
  }

  try {
    return await classifierPromise;
  } catch (cause) {
    classifierPromise = null;
    classifierLoaded = false;
    throw cause;
  }
}

export function isSmartExcludeClassifierLoaded(): boolean {
  return classifierLoaded;
}

export function resetSmartExcludeClassifierForTests(): void {
  classifierPromise = null;
  classifierLoaded = false;
}
