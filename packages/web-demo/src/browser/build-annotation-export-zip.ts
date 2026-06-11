import type { RoiFrameAnnotation } from "@lisca/contracts";
import { strToU8, zipSync } from "fflate";

export type BuildAnnotationExportZipInput = {
  stem: string;
  classificationLabelId: string | null;
  maskPng?: Uint8Array | null;
};

export function buildAnnotationExportZip(input: BuildAnnotationExportZipInput): Uint8Array {
  const jsonName = `${input.stem}.annotation.json`;
  const maskName = `${input.stem}.mask.png`;
  const hasMask = Boolean(input.maskPng && input.maskPng.length > 0);
  const annotation: RoiFrameAnnotation = {
    classificationLabelId: input.classificationLabelId,
    maskPath: hasMask ? maskName : null,
    updatedAt: new Date().toISOString(),
  };
  const files: Record<string, Uint8Array> = {
    [jsonName]: strToU8(`${JSON.stringify(annotation, null, 2)}\n`),
  };
  if (hasMask && input.maskPng) {
    files[maskName] = input.maskPng;
  }
  return zipSync(files);
}
