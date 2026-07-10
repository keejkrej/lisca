import { Button } from "@lisca/ui/components";

import type { DemoAlignState } from "@lisca/web-demo";
import type { Accessor } from "solid-js";

export function DemoAlignDownloadButton(props: { state: Accessor<DemoAlignState>; class?: string }) {
  return (
    <Button
      class={props.class ?? "w-full justify-center"}
      disabled={!props.state().frame || props.state().saving}
      loading={props.state().saving}
      size="sm"
      type="button"
      variant="outline"
      onClick={() => void props.state().saveCurrent()}
    >
      Download
    </Button>
  );
}