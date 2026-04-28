import type {
  BasicInfoStep1,
  BasicInfoStep2,
  BasicInfoStep3,
  StudioStep,
} from "./studioStore";

export type StudioRoutePath =
  | "/choose-assay"
  | "/basic-info/1"
  | "/basic-info/2"
  | "/basic-info/3"
  | "/align-pattern";

export const STUDIO_STEP_ROUTES: Record<StudioStep, StudioRoutePath> = {
  welcome: "/choose-assay",
  info1: "/basic-info/1",
  info2: "/basic-info/2",
  info3: "/basic-info/3",
  alignPattern: "/align-pattern",
};

export function studioStepToPath(step: StudioStep): StudioRoutePath {
  return STUDIO_STEP_ROUTES[step];
}

export function studioPathToStep(path: string): StudioStep | null {
  switch (path) {
    case "/choose-assay":
      return "welcome";
    case "/basic-info/1":
      return "info1";
    case "/basic-info/2":
      return "info2";
    case "/basic-info/3":
      return "info3";
    case "/align-pattern":
      return "alignPattern";
    default:
      return null;
  }
}

export function validInfo1(info1: BasicInfoStep1): boolean {
  return (
    info1.name.trim().length > 0 &&
    info1.date.trim().length > 0 &&
    info1.dataPath.trim().length > 0 &&
    info1.saveTo.trim().length > 0
  );
}

export function validInfo2(info2: BasicInfoStep2): boolean {
  return (
    info2.pattern.trim().length > 0 &&
    info2.timelapseAmount != null &&
    info2.timelapseAmount > 0 &&
    info2.selectedFeature !== null
  );
}

export function validInfo3(info3: BasicInfoStep3): boolean {
  if (info3.selectedSlideId === null) return false;
  return info3.samples.every(
    (r) =>
      r.channel.trim().length > 0 &&
      r.name.trim().length > 0 &&
      r.positions.trim().length > 0,
  );
}

export type StudioRouteState = {
  step: StudioStep;
  assayId: string | null;
  info1: BasicInfoStep1;
  info2: BasicInfoStep2;
  info3: BasicInfoStep3;
};

export function nextStudioStep(state: StudioRouteState): StudioStep | null {
  if (state.step === "welcome") {
    return state.assayId ? "info1" : null;
  }
  if (state.step === "info1") {
    return validInfo1(state.info1) ? "info2" : null;
  }
  if (state.step === "info2") {
    return validInfo2(state.info2) ? "info3" : null;
  }
  if (state.step === "info3") {
    return validInfo3(state.info3) ? "alignPattern" : null;
  }
  return null;
}

export function nextStudioPath(state: StudioRouteState): StudioRoutePath | null {
  const nextStep = nextStudioStep(state);
  return nextStep ? studioStepToPath(nextStep) : null;
}
