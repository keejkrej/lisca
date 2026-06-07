import type { AnnotatorDataPort } from "@lisca/client/ports/types";
import { createAnnotatorPort } from "@lisca/client/ports/annotator";
import { createLiscaPort, toHostFilePickerOperations } from "@lisca/web-app";

const port = createLiscaPort<AnnotatorDataPort>({
  defaultPort: 8766,
  env: {
    httpUrl: import.meta.env.VITE_HTTP_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
    wsHost: import.meta.env.VITE_WS_HOST,
    wsPort: import.meta.env.VITE_WS_PORT,
    dev: import.meta.env.DEV,
  },
  createPort: createAnnotatorPort,
});

export const annotatorPortRegistry = port.registry;

export const readAnnotatorPort = port.read;
export const ensureAnnotatorPort = port.ensure;
export const setAnnotatorPortForTests = port.setForTests;
export const resetAnnotatorPortForTests = port.resetForTests;

export const resolveAnnotatorHttpBaseUrl = port.httpBaseUrl;
export const resolveAnnotatorWsUrl = port.wsUrl;
export const toErrorMessage = port.toErrorMessage;

/** Primary annotator API for app code. */
export const annotatorClient = port.ensure();

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const annotatorHostOperations = toHostFilePickerOperations(annotatorClient);
