import { createAnnotatorPort } from "@lisca/client/ports/annotator";
import { createLiscaPort, toHostFilePickerOperations } from "@lisca/web-app";

const port = createLiscaPort({
  defaultPort: 8766,
  createPort: createAnnotatorPort,
});

export const resolveAnnotatorHttpBaseUrl = port.httpBaseUrl;
export const toErrorMessage = port.toErrorMessage;
export const annotatorClient = port.client;

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const annotatorHostOperations = toHostFilePickerOperations(annotatorClient);
