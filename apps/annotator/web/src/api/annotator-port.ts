import { toFetchErrorMessage } from "@lisca/client/errors";
import { createAnnotatorPort } from "@lisca/client/ports/annotator";
import { toHostFilePickerOperations } from "@lisca/web-app";

export const annotatorClient = createAnnotatorPort();
export const toErrorMessage = toFetchErrorMessage;

/** Promise-based host operations for `@lisca/ui` file pickers. */
export const annotatorHostOperations = toHostFilePickerOperations(annotatorClient);
