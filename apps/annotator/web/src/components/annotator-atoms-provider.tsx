import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-solid";
import type { JSX } from "solid-js";

import { annotatorUiAtom, createInitialAnnotatorUiState } from "../atoms/annotator-ui-atoms";

function AnnotatorAtomInitialValues(props: { children?: JSX.Element }) {
  useAtomInitialValues([[annotatorUiAtom, createInitialAnnotatorUiState()] as const]);
  return props.children;
}

export function AnnotatorAtomsProvider(props: { children?: JSX.Element }) {
  return (
    <RegistryProvider>
      <AnnotatorAtomInitialValues>{props.children}</AnnotatorAtomInitialValues>
    </RegistryProvider>
  );
}
