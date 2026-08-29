import type { WorkspaceScan } from "@lisca/contracts";
import { Atom, AsyncResult as Result } from "effect/unstable/reactivity";

import { createAlignerQueryAtoms, createAppRuntime } from "@lisca/client/atoms";

import { alignerClient } from "../api/aligner-port";

export const alignerRuntime = createAppRuntime();

export const alignerQueryAtoms = createAlignerQueryAtoms(alignerRuntime, alignerClient);

export const { scanSourceAtom } = alignerQueryAtoms;

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
