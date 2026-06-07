import type { RoiWorkspaceScan, WorkspaceScan } from "@lisca/contracts";
import { Atom, Result } from "@effect-atom/atom-react";

import {
  createAppRuntime,
  createStudioQueryAtoms,
  studioPortLayer,
} from "@lisca/client/atoms";

import { ensureStudioPort } from "../api/studio-port";

export const studioRuntime = createAppRuntime(studioPortLayer(ensureStudioPort()));

export const studioQueryAtoms = createStudioQueryAtoms(studioRuntime);

export const { scanSourceAtom, roiWorkspaceScanAtom, autoExcludePreviewAtom } = studioQueryAtoms;

export const scanIdleAtom = Atom.make(Result.initial<WorkspaceScan>());
export const roiScanIdleAtom = Atom.make(Result.initial<RoiWorkspaceScan>());
