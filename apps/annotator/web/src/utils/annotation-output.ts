import type { AnnotationMode, RoiFrameRequest } from "@lisca/contracts";

export function annotationOutputPaths(request: RoiFrameRequest | null, _mode: AnnotationMode) {
  if (!request) return ["annotations/roi/..."];
  const base = `annotations/roi/Pos${request.pos}/Roi${request.roi}/C${request.channel}_T${request.time}_Z${request.z}`;
  return [`${base}.json`, `${base}.png`];
}
