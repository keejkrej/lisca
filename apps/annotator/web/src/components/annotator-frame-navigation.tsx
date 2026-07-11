import { RoiFrameNavigation } from "@lisca/ui/features";

import { useAnnotateNav } from "../state/annotate-page-selectors";

export function AnnotatorFrameNavigation() {
  const nav = useAnnotateNav();

  return (
    <RoiFrameNavigation
      changeSelection={nav.changeSelection}
      position={nav.position}
      scan={nav.scan}
      selection={nav.selection}
      setSelection={nav.setSelection}
    />
  );
}
