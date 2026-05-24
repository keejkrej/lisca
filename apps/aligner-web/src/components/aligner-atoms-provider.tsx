import { RegistryProvider, useAtomInitialValues } from "@effect-atom/atom-react";
import { useMemo, type ReactNode } from "react";

import {
  alignerUiAtom,
  createInitialAlignerUiState,
  readAlignerSession,
} from "../atoms/aligner-ui-atoms";

function AlignerAtomInitialValues({ children }: { children: ReactNode }) {
  useAtomInitialValues(
    useMemo(() => {
      const session = readAlignerSession();
      if (!session) return [];
      return [
        [
          alignerUiAtom,
          {
            ...createInitialAlignerUiState(),
            workspacePath: session.workspacePath,
            source: session.source,
          },
        ],
      ] as const;
    }, []),
  );
  return children;
}

export function AlignerAtomsProvider({ children }: { children: ReactNode }) {
  return (
    <RegistryProvider>
      <AlignerAtomInitialValues>{children}</AlignerAtomInitialValues>
    </RegistryProvider>
  );
}
