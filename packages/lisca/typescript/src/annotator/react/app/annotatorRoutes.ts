import type { AnnotationMode } from "lisca/shared/contracts";

import type { AnnotatorDataMode } from "./AnnotatorNavbar";

export type AnnotatorRoutePath = "/roi" | "/raw";

export const LAST_ANNOTATOR_DATA_MODE_KEY = "annotator.dataMode";
export const DEFAULT_ANNOTATION_MODE: AnnotationMode = "semantic";

export function parseAnnotatorDataMode(value: unknown): AnnotatorDataMode | null {
  return value === "roi" || value === "raw" ? value : null;
}

export function annotatorDataModeToPath(mode: AnnotatorDataMode): AnnotatorRoutePath {
  return mode === "raw" ? "/raw" : "/roi";
}

export function annotatorPathToDataMode(path: string): AnnotatorDataMode | null {
  if (path === "/roi") return "roi";
  if (path === "/raw") return "raw";
  return null;
}

export function parseAnnotationMode(value: unknown): AnnotationMode | null {
  return value === "classification" || value === "semantic" || value === "instance"
    ? value
    : null;
}

export function validateAnnotationModeSearch(value: unknown): AnnotationMode {
  return parseAnnotationMode(value) ?? DEFAULT_ANNOTATION_MODE;
}

export function readStoredAnnotatorDataMode(
  storage: Pick<Storage, "getItem"> | null | undefined,
): AnnotatorDataMode | null {
  if (!storage) return null;
  return parseAnnotatorDataMode(storage.getItem(LAST_ANNOTATOR_DATA_MODE_KEY));
}

export function annotatorIndexRedirectPath(
  storage: Pick<Storage, "getItem"> | null | undefined,
): AnnotatorRoutePath {
  return annotatorDataModeToPath(readStoredAnnotatorDataMode(storage) ?? "roi");
}
