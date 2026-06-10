import type { RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-react";

import { createStudioQueryAtoms, studioPortLayer } from "@lisca/client/atoms";
import { createLiscaAppBootstrap } from "@lisca/client/bootstrap";

import { ensureStudioPort } from "../api/studio-port";

const studioPort = ensureStudioPort();
const bootstrap = createLiscaAppBootstrap(studioPortLayer(studioPort), studioPort);

export const studioRuntime = bootstrap.runtime;

export const studioQueryAtoms = createStudioQueryAtoms(bootstrap.runtime);

export const { scanSourceAtom, roiWorkspaceScanAtom, autoExcludePreviewAtom } = studioQueryAtoms;

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
