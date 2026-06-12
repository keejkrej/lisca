import type { AlignerSource, MemoryTouchRequest } from "@lisca/contracts";
import { Effect } from "effect";

import type { ProfilePort } from "./port";
import type { StudioProfileSession } from "./session";
import { studioProfileCanUseMemory } from "./session";

export function touchWorkspaceMemory(
  port: ProfilePort,
  session: StudioProfileSession | null,
  path: string,
  label?: string,
): void {
  if (!studioProfileCanUseMemory(session)) return;
  const trimmed = path.trim();
  if (!trimmed) return;
  void Effect.runPromise(
    port.touchMemory({
      kind: "workspace",
      path: trimmed,
      label,
    }),
  ).catch(() => undefined);
}

export function touchSourceMemory(
  port: ProfilePort,
  session: StudioProfileSession | null,
  source: AlignerSource,
  label?: string,
): void {
  if (!studioProfileCanUseMemory(session)) return;
  void Effect.runPromise(
    port.touchMemory({
      kind: "source",
      source,
      label,
    }),
  ).catch(() => undefined);
}

export function touchAssayMemory(
  port: ProfilePort,
  session: StudioProfileSession | null,
  path: string,
  assayLabel?: string,
  workspacePath?: string,
): void {
  if (!studioProfileCanUseMemory(session)) return;
  const trimmed = path.trim();
  if (!trimmed) return;
  const payload: MemoryTouchRequest = {
    kind: "assay",
    path: trimmed,
    assayLabel,
    workspacePath,
  };
  void Effect.runPromise(port.touchMemory(payload)).catch(() => undefined);
}
