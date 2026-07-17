import { createAlignerPort } from "@lisca/client/ports/aligner";
import { createLiscaPort, toHostFilePickerOperations } from "@lisca/web-app";

const port = createLiscaPort({
  defaultPort: 8765,
  createPort: createAlignerPort,
});

export const resolveAlignerHttpBaseUrl = port.httpBaseUrl;
export const toErrorMessage = port.toErrorMessage;
export const alignerClient = port.client;

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const alignerHostOperations = toHostFilePickerOperations(alignerClient);
