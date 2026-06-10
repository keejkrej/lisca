import { unstable_batchedUpdates } from "react-dom";

import {
  useCanvasResourceTransaction as useHeadlessCanvasResourceTransaction,
  type CanvasResourceTransactionOptions,
} from "@lisca/ui-headless/canvas-resource-transaction";

export type { CanvasResourceTransactionOptions };

export function useCanvasResourceTransaction() {
  return useHeadlessCanvasResourceTransaction({ batch: unstable_batchedUpdates });
}
