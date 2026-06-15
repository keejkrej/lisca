import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-react";
import { type ReactNode } from "react";
import { alignerUiAtom, createInitialAlignerUiState } from "../atoms/aligner-ui-atoms";

function AlignerAtomInitialValues({ children }: { children: ReactNode }) {
  useAtomInitialValues([[alignerUiAtom, createInitialAlignerUiState()] as const]);
  return children;
}

export function AlignerAtomsProvider({ children }: { children: ReactNode }) {
  return (
    <RegistryProvider>
      <AlignerAtomInitialValues>{children}</AlignerAtomInitialValues>
    </RegistryProvider>
  );
}
