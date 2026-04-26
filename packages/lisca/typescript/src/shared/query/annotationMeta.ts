import type {
  RawFrameAnnotation,
  RawFrameRequest,
  RoiFrameAnnotation,
  RoiFrameRequest,
  ViewerDataPort,
  ViewerSource,
} from "lisca/shared/contracts";

/** Tier A: load full payload from IPC, return only metadata (mask stays out of Query cache). */
export async function fetchRoiFrameAnnotationMeta(
  backend: ViewerDataPort,
  workspacePath: string,
  request: RoiFrameRequest,
): Promise<RoiFrameAnnotation> {
  const loaded = await backend.loadRoiFrameAnnotation(workspacePath, request);
  return loaded.annotation;
}

export async function fetchRawFrameAnnotationMeta(
  backend: ViewerDataPort,
  workspacePath: string,
  source: ViewerSource,
  request: RawFrameRequest,
): Promise<RawFrameAnnotation> {
  const loaded = await backend.loadRawFrameAnnotation(workspacePath, source, request);
  return loaded.annotation;
}
