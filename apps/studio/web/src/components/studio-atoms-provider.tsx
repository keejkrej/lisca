import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-react";
import { type ReactNode } from "react";
import {
  createInitialStudioAlignUiState,
  readStudioAlignSession,
  studioAlignUiAtom,
} from "../state/studio-align-store";
import {
  createInitialStudioAnnotateUiState,
  readStudioAnnotateSession,
  studioAnnotateUiAtom,
} from "../state/studio-annotate-store";
import {
  createInitialStudioWizardState,
  readStudioSession,
  studioWizardAtom,
} from "../state/studio-store";
function StudioWizardInitialValues() {
  useAtomInitialValues(
    (() => {
      const wizardSession = readStudioSession();
      return [[studioWizardAtom, wizardSession ?? createInitialStudioWizardState()] as const];
    })(),
  );
  return null;
}
function StudioAlignInitialValues() {
  useAtomInitialValues(
    (() => {
      const alignSession = readStudioAlignSession();
      if (!alignSession) return [];
      return [
        [
          studioAlignUiAtom,
          {
            ...createInitialStudioAlignUiState(),
            ...alignSession,
          },
        ] as const,
      ];
    })(),
  );
  return null;
}
function StudioAnnotateInitialValues() {
  useAtomInitialValues(
    (() => {
      const annotateSession = readStudioAnnotateSession();
      if (!annotateSession) return [];
      return [
        [
          studioAnnotateUiAtom,
          {
            ...createInitialStudioAnnotateUiState(),
            ...annotateSession,
          },
        ] as const,
      ];
    })(),
  );
  return null;
}
export function StudioAtomsProvider({ children }: { children: ReactNode }) {
  return (
    <RegistryProvider>
      <StudioWizardInitialValues />
      <StudioAlignInitialValues />
      <StudioAnnotateInitialValues />
      {children}
    </RegistryProvider>
  );
}
