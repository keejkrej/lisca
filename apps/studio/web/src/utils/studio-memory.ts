import {
  touchAssayMemory,
  touchSourceMemory,
  touchWorkspaceMemory,
} from "@lisca/client/profile/record-memory";
import type { StudioProfileSession } from "@lisca/client/profile/session";
import type { AlignerSource } from "@lisca/contracts";

import { studioProfileClient } from "../api/studio-profile-port";

export function recordStudioWorkspaceMemory(
  session: StudioProfileSession,
  path: string,
  label?: string,
): void {
  touchWorkspaceMemory(studioProfileClient, session, path, label);
}

export function recordStudioSourceMemory(
  session: StudioProfileSession,
  source: AlignerSource,
  label?: string,
): void {
  touchSourceMemory(studioProfileClient, session, source, label);
}

export function recordStudioAssayMemory(
  session: StudioProfileSession,
  path: string,
  assayLabel?: string,
  workspacePath?: string,
): void {
  touchAssayMemory(studioProfileClient, session, path, assayLabel, workspacePath);
}
