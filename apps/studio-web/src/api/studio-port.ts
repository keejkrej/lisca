import type { StudioDataPort } from "@lisca/client/ports/types";
import { createPortRegistry } from "@lisca/client/port-registry";
import { createStudioPort } from "@lisca/client/ports/studio";

import { createStudioPortDeps } from "./studio-client";

const registry = createPortRegistry(() => createStudioPort(createStudioPortDeps()));

export const studioPortRegistry = registry;

export function readStudioPort(): StudioDataPort | undefined {
  return registry.read();
}

export function ensureStudioPort(): StudioDataPort {
  return registry.ensure();
}

export function setStudioPortForTests(port: StudioDataPort): void {
  registry.setForTests(port);
}

export function resetStudioPortForTests(): void {
  registry.resetForTests();
}

/** Primary studio API for app code. */
export const studioClient = ensureStudioPort();
