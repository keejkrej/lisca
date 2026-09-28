import { toFetchErrorMessage } from "@lisca/client/errors";
import { createAlignerPort } from "@lisca/client/ports/aligner";
import { toHostFilePickerOperations } from "@lisca/web-app";

export const alignerClient = createAlignerPort();
export const toErrorMessage = toFetchErrorMessage;

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const alignerHostOperations = toHostFilePickerOperations(alignerClient);
