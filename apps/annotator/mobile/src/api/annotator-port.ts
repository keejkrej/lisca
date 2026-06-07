import type { AnnotatorDataPort } from "@lisca/client/ports/types";
import { createAnnotatorPort } from "@lisca/client/ports/annotator";
import { createLiscaMobilePort, toHostFilePickerOperations } from "@lisca/mobile-app";

const port = createLiscaMobilePort<AnnotatorDataPort>({
  defaultPort: 8766,
  createPort: createAnnotatorPort,
});

export const ensureAnnotatorPort = port.ensure;
export const resolveAnnotatorHttpBaseUrl = port.httpBaseUrl;
export const toErrorMessage = port.toErrorMessage;
export const annotatorClient = port.ensure();
export const annotatorHostOperations = toHostFilePickerOperations(annotatorClient);
