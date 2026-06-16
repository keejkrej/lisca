import { IBIDI_DEMO_SAMPLE_IMAGES } from "./load-image-file";

import type { DemoFrameCrop } from "./crop-demo-frame";

export type DemoSampleImageId = keyof typeof IBIDI_DEMO_SAMPLE_IMAGES;

export type DemoSampleImage = {
  id: DemoSampleImageId;
  fileName: string;
  /** Annotator embedded demo crop in full-resolution source coordinates. */
  annotatorCrop: DemoFrameCrop;
};

export const DEMO_SAMPLE_IMAGES: readonly DemoSampleImage[] = [
  {
    id: "singleCell",
    fileName: "mp_example_singlecell.jpg",
    annotatorCrop: { x: 175, y: 140, w: 33, h: 33 },
  },
  {
    id: "multiCell",
    fileName: "mp_example_multicell.jpg",
    annotatorCrop: { x: 176, y: 127, w: 60, h: 60 },
  },
  {
    id: "rccComposite",
    fileName: "mp_RCC_4x_composite.jpg",
    annotatorCrop: { x: 154, y: 210, w: 42, h: 42 },
  },
  {
    id: "ratComposite",
    fileName: "Rat1_10x_composite.jpg",
    annotatorCrop: { x: 150, y: 197, w: 105, h: 105 },
  },
] as const;

export const DEFAULT_DEMO_SAMPLE_ID: DemoSampleImageId = DEMO_SAMPLE_IMAGES[0]?.id ?? "singleCell";

export function sampleIdFromFileName(fileName: string | null): DemoSampleImageId | null {
  if (!fileName) return null;
  return DEMO_SAMPLE_IMAGES.find((sample) => sample.fileName === fileName)?.id ?? null;
}

export function fileNameFromSampleId(sampleId: DemoSampleImageId): string {
  return DEMO_SAMPLE_IMAGES.find((sample) => sample.id === sampleId)?.fileName ?? "sample.jpg";
}

export function annotatorCropFromSampleId(sampleId: DemoSampleImageId): DemoFrameCrop {
  return (
    DEMO_SAMPLE_IMAGES.find((sample) => sample.id === sampleId)?.annotatorCrop ?? {
      x: 0,
      y: 0,
      w: 64,
      h: 64,
    }
  );
}

export function resolveSelectedSampleId(
  fileName: string | null,
  defaultSampleId: DemoSampleImageId = DEFAULT_DEMO_SAMPLE_ID,
): DemoSampleImageId {
  return sampleIdFromFileName(fileName) ?? defaultSampleId;
}
