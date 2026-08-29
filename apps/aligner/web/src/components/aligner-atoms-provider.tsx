import { RegistryProvider, useAtomInitialValues } from "@effect/atom-solid";
import type { JSX } from "solid-js";

import { createInitialAlignerUiState, alignerUiAtom } from "../atoms/aligner-ui-atoms";

function AlignerAtomInitialValues(props: { children?: JSX.Element }) {
  useAtomInitialValues([[alignerUiAtom, createInitialAlignerUiState()] as const]);
  return props.children;
}

export function AlignerAtomsProvider(props: { children?: JSX.Element }) {
  return (
    <RegistryProvider>
      <AlignerAtomInitialValues>{props.children}</AlignerAtomInitialValues>
    </RegistryProvider>
  );
}
