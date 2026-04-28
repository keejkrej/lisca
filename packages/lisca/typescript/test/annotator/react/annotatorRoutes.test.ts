import { describe, expect, test } from "bun:test";

import {
  DEFAULT_ANNOTATION_MODE,
  LAST_ANNOTATOR_DATA_MODE_KEY,
  annotatorDataModeToPath,
  annotatorIndexRedirectPath,
  annotatorPathToDataMode,
  parseAnnotationMode,
  parseAnnotatorDataMode,
  validateAnnotationModeSearch,
} from "../../../src/annotator/react";

function storage(value: string | null): Pick<Storage, "getItem"> {
  return {
    getItem: (key: string) => (key === LAST_ANNOTATOR_DATA_MODE_KEY ? value : null),
  };
}

describe("annotator route helpers", () => {
  test("maps data modes to routes", () => {
    expect(annotatorDataModeToPath("roi")).toBe("/roi");
    expect(annotatorDataModeToPath("raw")).toBe("/raw");
    expect(annotatorPathToDataMode("/roi")).toBe("roi");
    expect(annotatorPathToDataMode("/raw")).toBe("raw");
  });

  test("falls back to ROI for invalid or missing stored data mode", () => {
    expect(parseAnnotatorDataMode("bad")).toBeNull();
    expect(annotatorIndexRedirectPath(storage("bad"))).toBe("/roi");
    expect(annotatorIndexRedirectPath(storage(null))).toBe("/roi");
  });

  test("validates annotationMode search values", () => {
    expect(parseAnnotationMode("classification")).toBe("classification");
    expect(parseAnnotationMode("semantic")).toBe("semantic");
    expect(parseAnnotationMode("instance")).toBe("instance");
    expect(validateAnnotationModeSearch("bad")).toBe(DEFAULT_ANNOTATION_MODE);
    expect(validateAnnotationModeSearch(undefined)).toBe(DEFAULT_ANNOTATION_MODE);
  });
});
