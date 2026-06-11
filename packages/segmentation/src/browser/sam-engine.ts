import type { FrameResult } from "@lisca/utils";

import type { SmartSegmentEngine, SmartSegmentPoint } from "../types";
import { frameToCanvas } from "./frame-to-canvas";

const MODEL_ID = "Xenova/slimsam-77-uniform";

type ProcessedImage = {
  original_sizes: number[][];
  reshaped_input_sizes: number[][];
};

type ImageEmbeddings = Record<string, unknown>;

type TransformersModule = typeof import("@huggingface/transformers");

let transformersModule: TransformersModule | null = null;

async function loadTransformers(): Promise<TransformersModule> {
  if (!transformersModule) {
    transformersModule = await import("@huggingface/transformers");
  }
  return transformersModule;
}

function pickBestMaskIndex(scores: ArrayLike<number>): number {
  let bestIndex = 0;
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index]! > scores[bestIndex]!) bestIndex = index;
  }
  return bestIndex;
}

function extractBestMask(
  maskTensor: { data: ArrayLike<number | boolean>; dims: number[] },
  scores: ArrayLike<number>,
  width: number,
  height: number,
): Uint8Array {
  const pixelCount = width * height;
  const out = new Uint8Array(pixelCount);
  const numMasks = scores.length;
  const bestIndex = pickBestMaskIndex(scores);
  const data = maskTensor.data;

  if (maskTensor.dims.length === 4 && maskTensor.dims[1] === numMasks) {
    for (let index = 0; index < pixelCount; index += 1) {
      if (data[index * numMasks + bestIndex]) out[index] = 1;
    }
    return out;
  }

  for (let index = 0; index < pixelCount; index += 1) {
    if (data[numMasks * index + bestIndex]) out[index] = 1;
  }
  return out;
}

export type BrowserSamEngineOptions = {
  modelId?: string;
  device?: "webgpu" | "wasm";
};

type SamModelInstance = {
  get_image_embeddings(processed: ProcessedImage): Promise<ImageEmbeddings>;
  (inputs: ImageEmbeddings & {
    input_points: InstanceType<TransformersModule["Tensor"]>;
    input_labels: InstanceType<TransformersModule["Tensor"]>;
  }): Promise<{
    pred_masks: unknown;
    iou_scores: { data: Float32Array };
  }>;
};

type SamProcessorInstance = {
  (image: unknown): Promise<ProcessedImage>;
  post_process_masks(
    pred_masks: unknown,
    original_sizes: number[][],
    reshaped_input_sizes: number[][],
  ): Promise<Array<Array<{ data: ArrayLike<number | boolean>; dims: number[] }>>>;
};

export class BrowserSamEngine implements SmartSegmentEngine {
  private readonly modelId: string;
  private readonly device: "webgpu" | "wasm";
  private model: SamModelInstance | null = null;
  private processor: SamProcessorInstance | null = null;
  private frame: FrameResult | null = null;
  private imageProcessed: ProcessedImage | null = null;
  private imageEmbeddings: ImageEmbeddings | null = null;
  private loadPromise: Promise<void> | null = null;
  private preparePromise: Promise<void> | null = null;

  constructor(options: BrowserSamEngineOptions = {}) {
    this.modelId = options.modelId ?? MODEL_ID;
    this.device = options.device ?? "webgpu";
  }

  private async ensureLoaded(): Promise<void> {
    if (this.model && this.processor) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const { SamModel, AutoProcessor } = await loadTransformers();
      const loadOptions = {
        dtype: this.device === "webgpu" ? ("fp16" as const) : ("q8" as const),
        device: this.device,
      };
      try {
        this.model = (await SamModel.from_pretrained(this.modelId, loadOptions)) as unknown as SamModelInstance;
        this.processor = (await AutoProcessor.from_pretrained(this.modelId)) as unknown as SamProcessorInstance;
      } catch (cause) {
        if (this.device !== "webgpu") throw cause;
        this.model = (await SamModel.from_pretrained(this.modelId, {
          dtype: "q8",
          device: "wasm",
        })) as unknown as SamModelInstance;
        this.processor = (await AutoProcessor.from_pretrained(this.modelId)) as unknown as SamProcessorInstance;
      }
    })();

    return this.loadPromise;
  }

  async prepareFrame(frame: FrameResult): Promise<void> {
    await this.ensureLoaded();
    if (
      this.frame &&
      this.frame.width === frame.width &&
      this.frame.height === frame.height &&
      this.frame.pixels === frame.pixels
    ) {
      return;
    }
    if (this.preparePromise) await this.preparePromise;

    this.preparePromise = (async () => {
      const { RawImage } = await loadTransformers();
      if (!this.model || !this.processor) {
        throw new Error("Smart segment model failed to load");
      }

      const canvas = frameToCanvas(frame);
      const imageInput = RawImage.fromCanvas(canvas);
      this.imageProcessed = await this.processor(imageInput);
      this.imageEmbeddings = await this.model.get_image_embeddings(this.imageProcessed);
      this.frame = frame;
    })();

    try {
      await this.preparePromise;
    } finally {
      this.preparePromise = null;
    }
  }

  async segment(points: SmartSegmentPoint[]): Promise<Uint8Array> {
    if (points.length === 0 || !this.frame || !this.imageProcessed || !this.imageEmbeddings) {
      const width = this.frame?.width ?? 0;
      const height = this.frame?.height ?? 0;
      return new Uint8Array(width * height);
    }

    await this.ensureLoaded();
    const { Tensor } = await loadTransformers();
    if (!this.model || !this.processor) {
      throw new Error("Smart segment model failed to load");
    }

    const frame = this.frame;
    const processed = this.imageProcessed;
    const reshaped = processed.reshaped_input_sizes[0]!;
    const scaleX = reshaped[1]! / frame.width;
    const scaleY = reshaped[0]! / frame.height;
    const flatPoints = points.flatMap((point) => [point.x * scaleX, point.y * scaleY]);
    const labels = points.map((point) => BigInt(point.label));

    const input_points = new Tensor("float32", flatPoints, [1, 1, points.length, 2]);
    const input_labels = new Tensor("int64", labels, [1, 1, points.length]);

    const { pred_masks, iou_scores } = await this.model({
      ...this.imageEmbeddings,
      input_points,
      input_labels,
    });

    const masks = await this.processor.post_process_masks(
      pred_masks,
      processed.original_sizes,
      processed.reshaped_input_sizes,
    );

    const maskTensor = masks[0]![0]!;
    return extractBestMask(maskTensor, iou_scores.data, frame.width, frame.height);
  }

  dispose(): void {
    this.frame = null;
    this.imageProcessed = null;
    this.imageEmbeddings = null;
    this.preparePromise = null;
  }
}

let sharedEngine: BrowserSamEngine | null = null;

export function getBrowserSamEngine(options?: BrowserSamEngineOptions): BrowserSamEngine {
  if (!sharedEngine) sharedEngine = new BrowserSamEngine(options);
  return sharedEngine;
}
