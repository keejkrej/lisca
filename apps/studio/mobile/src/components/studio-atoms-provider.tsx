import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-react";
import { type ReactNode } from "react";
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

export function StudioAtomsProvider({ children }: { children: ReactNode }) {
  return (
    <RegistryProvider>
      <StudioWizardInitialValues />
      {children}
    </RegistryProvider>
  );
}
