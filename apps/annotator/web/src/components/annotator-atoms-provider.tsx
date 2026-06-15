import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-react";
import { type ReactNode } from "react";
import {
  annotatorUiAtom,
  createInitialAnnotatorUiState,
} from "../atoms/annotator-ui-atoms";

function AnnotatorAtomInitialValues({ children }: { children: ReactNode }) {
  useAtomInitialValues([[annotatorUiAtom, createInitialAnnotatorUiState()] as const]);
  return children;
}

export function AnnotatorAtomsProvider({ children }: { children: ReactNode }) {
  return (
    <RegistryProvider>
      <AnnotatorAtomInitialValues>{children}</AnnotatorAtomInitialValues>
    </RegistryProvider>
  );
}
