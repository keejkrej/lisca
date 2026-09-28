import { toFetchErrorMessage } from "@lisca/client/errors";
import { createStudioPort } from "@lisca/client/ports/studio";
import { toHostFilePickerOperations } from "@lisca/web-app";

export const studioClient = createStudioPort();
export const toErrorMessage = toFetchErrorMessage;

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const studioHostOperations = toHostFilePickerOperations(studioClient);
