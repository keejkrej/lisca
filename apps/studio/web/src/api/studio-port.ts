import { createStudioPort } from "@lisca/client/ports/studio";
import { createLiscaPort, toHostFilePickerOperations } from "@lisca/web-app";

const port = createLiscaPort({
  defaultPort: 8767,
  createPort: createStudioPort,
});

export const resolveStudioHttpBaseUrl = port.httpBaseUrl;
export const toErrorMessage = port.toErrorMessage;
export const studioClient = port.client;

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const studioHostOperations = toHostFilePickerOperations(studioClient);
