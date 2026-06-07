import type { WorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-react";

import {
  alignerPortLayer,
  createAlignerQueryAtoms,
  createAppRuntime,
} from "@lisca/client/atoms";

import { ensureAlignerPort } from "../api/aligner-port";

export const alignerRuntime = createAppRuntime(alignerPortLayer(ensureAlignerPort()));

export const alignerQueryAtoms = createAlignerQueryAtoms(alignerRuntime);

export const { scanSourceAtom, savedBboxPositionsAtom, autoExcludePreviewAtom } = alignerQueryAtoms;

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
