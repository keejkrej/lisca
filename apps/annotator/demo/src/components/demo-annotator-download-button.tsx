import { Button } from "@lisca/ui/components";

import type { DemoAnnotatorState } from "../state/use-demo-annotator-state";

export function DemoAnnotatorDownloadButton({
  state,
  className,
}: {
  state: DemoAnnotatorState;
  className?: string;
}) {
  return (
    <Button
      className={className ?? "w-full justify-center"}
      disabled={!state.canSave}
      loading={state.saving}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => void state.saveCurrent()}
    >
      Download
    </Button>
  );
}
