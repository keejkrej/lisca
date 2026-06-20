import { RegistryProvider } from "@effect-atom/atom-react";
import { type ReactNode } from "react";
import { createInitialAlignerUiState, alignerUiAtom } from "../atoms/aligner-ui-atoms";
import { useAtomInitialValues } from "@effect-atom/atom-react";

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
