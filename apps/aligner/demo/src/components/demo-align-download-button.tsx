import { Button } from "@lisca/ui/components";

import type { DemoAlignState } from "@lisca/web-demo";

export function DemoAlignDownloadButton({
  state,
  className,
}: {
  state: DemoAlignState;
  className?: string;
}) {
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
      Download
    </Button>
  );
}
