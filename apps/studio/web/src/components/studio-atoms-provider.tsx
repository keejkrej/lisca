import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-solid";
import type { JSX } from "solid-js";

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

export function StudioAtomsProvider(props: { children?: JSX.Element }) {
  return (
    <RegistryProvider>
      <StudioWizardInitialValues />
      {props.children}
    </RegistryProvider>
  );
}
