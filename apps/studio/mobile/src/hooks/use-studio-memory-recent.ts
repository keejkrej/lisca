import { readStudioWizardMemoryRecent } from "@lisca/client/studio/wizard-memory";
import type { MemoryKind } from "@lisca/contracts";

const emptyRecent = { workspaces: [], sources: [], assays: [] };

export function useStudioMemoryRecent(kind: MemoryKind, enabled: boolean) {
  if (!enabled) return emptyRecent;
  return readStudioWizardMemoryRecent(kind);
}
