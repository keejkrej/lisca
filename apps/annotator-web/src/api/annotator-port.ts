import type { AnnotatorDataPort } from "@lisca/contracts";
import { createPortRegistry } from "@lisca/client/port-registry";
import { createAnnotatorPort } from "@lisca/client/ports/annotator";

import { createAnnotatorPortDeps } from "./annotator-client";

const registry = createPortRegistry(() => createAnnotatorPort(createAnnotatorPortDeps()));

export const annotatorPortRegistry = registry;

export function readAnnotatorPort(): AnnotatorDataPort | undefined {
  return registry.read();
}

export function ensureAnnotatorPort(): AnnotatorDataPort {
  return registry.ensure();
}

export function setAnnotatorPortForTests(port: AnnotatorDataPort): void {
  registry.setForTests(port);
}

export function resetAnnotatorPortForTests(): void {
  registry.resetForTests();
}

/** Primary annotator API for app code. */
export const annotatorPort = ensureAnnotatorPort();

/** @deprecated Use {@link annotatorPort}. */
export const annotatorApi = annotatorPort;
