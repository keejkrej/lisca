import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-react";
import { useMemo, type ReactNode } from "react";

import {
  annotatorUiAtom,
  createInitialAnnotatorUiState,
  readAnnotatorSession,
} from "../atoms/annotator-ui-atoms";

function AnnotatorAtomInitialValues({ children }: { children: ReactNode }) {
  useAtomInitialValues(
    useMemo(() => {
      const session = readAnnotatorSession();
      if (!session) return [];
      return [
        [
          annotatorUiAtom,
          {
            ...createInitialAnnotatorUiState(),
            workspacePath: session.workspacePath,
          },
        ],
      ] as const;
    }, []),
  );
  return children;
}

export function AnnotatorAtomsProvider({ children }: { children: ReactNode }) {
  return (
    <RegistryProvider>
      <AnnotatorAtomInitialValues>{children}</AnnotatorAtomInitialValues>
    </RegistryProvider>
  );
}
