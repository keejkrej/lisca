import { ASSAY_FEATURE } from "@lisca/contracts/assay";

import type { BasicInfo2FeatureId, BasicInfoSlideId } from "../state/studio-store";

export const featureImageSources: Record<BasicInfo2FeatureId, number> = {
  [ASSAY_FEATURE.MORPHOLOGY]: require("../assets/features/morphology.svg"),
  [ASSAY_FEATURE.PART_COUNT]: require("../assets/features/partcount.svg"),
  [ASSAY_FEATURE.PART_FLUOR]: require("../assets/features/partfluor.svg"),
  [ASSAY_FEATURE.TOTAL_FLUOR]: require("../assets/features/totalfluor.svg"),
};

export const slideImageSources: Record<BasicInfoSlideId, number> = {
  "slide-i": require("../assets/slides/slide-i.webp"),
  "slide-vi": require("../assets/slides/slide-vi.webp"),
};
