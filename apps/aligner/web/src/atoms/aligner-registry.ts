import { AtomRegistry } from "effect/reactivity";

import { alignerUiAtom, createInitialAlignerUiState } from "../atoms/aligner-ui-atoms";

export const alignerRegistry = AtomRegistry.make();
alignerRegistry.set(alignerUiAtom, createInitialAlignerUiState());
