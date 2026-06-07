import type { AlignerDataPort } from "@lisca/client/ports/types";
import { createAlignerPort } from "@lisca/client/ports/aligner";
import { createLiscaMobilePort, toHostFilePickerOperations } from "@lisca/mobile-app";

const port = createLiscaMobilePort<AlignerDataPort>({
  defaultPort: 8765,
  createPort: createAlignerPort,
});

export const alignerPortRegistry = port.registry;
export const ensureAlignerPort = port.ensure;
export const resolveAlignerHttpBaseUrl = port.httpBaseUrl;
export const resolveAlignerWsUrl = port.wsUrl;
export const toErrorMessage = port.toErrorMessage;
export const alignerClient = port.ensure();
export const alignerHostOperations = toHostFilePickerOperations(alignerClient);
