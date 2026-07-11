import { Button } from "@lisca/ui/components";

import type { DemoAnnotatorState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAnnotatorDownloadButton(props: {
  state: Accessor<DemoAnnotatorState>;
  class?: string;
}) {
  return (
    <Button
      class={props.class ?? "w-full justify-center"}
      disabled={!props.state().canSave}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => void props.state().saveCurrent()}
    >
      Download
    </Button>
  );
}