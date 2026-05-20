import type { AlignerDataPort } from "@lisca/client/ports/types";
import { createPortRegistry } from "@lisca/client/port-registry";
import { createAlignerPort } from "@lisca/client/ports/aligner";

import { createAlignerPortDeps } from "./aligner-client";

const registry = createPortRegistry(() => createAlignerPort(createAlignerPortDeps()));

export const alignerPortRegistry = registry;

export function readAlignerPort(): AlignerDataPort | undefined {
  return registry.read();
}

export function ensureAlignerPort(): AlignerDataPort {
  return registry.ensure();
}

export function setAlignerPortForTests(port: AlignerDataPort): void {
  registry.setForTests(port);
}

export function resetAlignerPortForTests(): void {
  registry.resetForTests();
}

/** Primary aligner API for app code. */
export const alignerClient = ensureAlignerPort();
