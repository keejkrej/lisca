export { clearDemoSession, readDemoSession, writeDemoSession } from "./demo-session-idb";
export { ALIGNER_DEMO_SESSION_KEY, ANNOTATOR_DEMO_SESSION_KEY } from "./demo-session-keys";
export {
  DemoNavbar,
  DemoNavbarActionButton,
  type DemoNavbarProps,
  type DemoSampleImageOption,
} from "./demo-navbar";
export {
  annotatorCropFromSampleId,
  DEFAULT_DEMO_SAMPLE_ID,
  DEMO_SAMPLE_IMAGES,
  resolveSelectedSampleId,
  sampleIdFromFileName,
  type DemoSampleImageId,
} from "./browser/demo-presets";
export type { DemoFrameCrop } from "./browser/crop-demo-frame";
export { useDebouncedEffect } from "./use-debounced-effect";
export type { AnnotationValue } from "./annotation-value";
export {
  annotationValuesEqual,
  cloneAnnotationValue,
  emptyAnnotationValue,
} from "./annotation-value";
export {
  demoAlignUiActions,
  demoAlignUiAtom,
  type DemoAlignSession,
  type DemoAlignUiState,
} from "./atoms/demo-align-ui";
export {
  currentDemoAnnotation,
  demoAnnotatorUiActions,
  demoAnnotatorUiAtom,
  DEFAULT_ANNOTATOR_DEMO_LABELS,
  type DemoAnnotatorSession,
  type DemoAnnotatorUiState,
} from "./atoms/demo-annotator-ui";
export { DemoAlignRoot, DemoAnnotatorRoot, DemoRegistryProvider } from "./atoms/demo-session-sync";
export { useDemoAlignState, type DemoAlignState } from "./hooks/use-demo-align-state";
export { useEmbeddedDemoPreset } from "./hooks/use-embedded-demo-preset";
export {
  useDemoAnnotatorState,
  type DemoAnnotatorState,
  type DemoAnnotationHandle,
} from "./hooks/use-demo-annotator-state";
