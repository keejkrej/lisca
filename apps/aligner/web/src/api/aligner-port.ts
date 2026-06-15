import type { AlignerDataPort } from "@lisca/client/ports/types";
import { createAlignerPort } from "@lisca/client/ports/aligner";
import { createLiscaPort, toHostFilePickerOperations } from "@lisca/web-app";

const port = createLiscaPort<AlignerDataPort>({
  defaultPort: 8765,
  env: {
    httpUrl: import.meta.env.VITE_HTTP_URL,
    httpHost: import.meta.env.VITE_HTTP_HOST,
    httpPort: import.meta.env.VITE_HTTP_PORT,
    dev: import.meta.env.DEV,
  },
  createPort: createAlignerPort,
});

export const alignerPortRegistry = port.registry;

export const readAlignerPort = port.read;
export const ensureAlignerPort = port.ensure;
export const setAlignerPortForTests = port.setForTests;
export const resetAlignerPortForTests = port.resetForTests;

export const resolveAlignerHttpBaseUrl = port.httpBaseUrl;
export const toErrorMessage = port.toErrorMessage;

/** Primary aligner API for app code. */
export const alignerClient = port.ensure();

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const alignerHostOperations = toHostFilePickerOperations(alignerClient);
