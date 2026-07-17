import type { WorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-solid";

import { alignerPortLayer, createAlignerQueryAtoms } from "@lisca/client/atoms";
import { createLiscaAppBootstrap } from "@lisca/client/bootstrap";

import { alignerClient } from "../api/aligner-port";

const bootstrap = createLiscaAppBootstrap(alignerPortLayer(alignerClient));

export const alignerRuntime = bootstrap.runtime;

export const alignerQueryAtoms = createAlignerQueryAtoms(bootstrap.runtime);

export const { scanSourceAtom } = alignerQueryAtoms;

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
