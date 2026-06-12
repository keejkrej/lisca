import type { RoiFrameRequest } from "@lisca/contracts";
import type { AnnotationMode } from "@lisca/ui-native/features";

export function annotationOutputPaths(request: RoiFrameRequest | null, _mode: AnnotationMode) {
  if (!request) return ["annotations/roi/..."];
  const base = `annotations/roi/Pos${request.pos}/Roi${request.roi}/C${request.channel}_T${request.time}_Z${request.z}`;
  return [`${base}.json`, `${base}.png`];
}
