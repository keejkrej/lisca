import { Button } from "@lisca/ui/components";
import { stemName } from "@lisca/web-demo/browser";

import type { DemoAlignState } from "../state/use-demo-align-state";

export function DemoAlignDownloadButton({
  state,
  className,
}: {
  state: DemoAlignState;
  className?: string;
}) {
  const stem = state.fileName ? stemName(state.fileName) : "image";
  const canSave = Boolean(state.frame);

  return (
    <Button
      className={className ?? "w-full justify-center"}
      disabled={!canSave || state.saving}
      loading={state.saving}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => void state.saveCurrent()}
    >
      Download {stem}-rois.zip
    </Button>
  );
}
