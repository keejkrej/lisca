import { ContrastControl, RoiFrameNavigation } from "@lisca/instrument";

import { useStudioAnnotateNav } from "../state/studio-annotate-page-selectors";

export function StudioAnnotateNav(props: { standard?: boolean }) {
  const nav = useStudioAnnotateNav();

  return (
    <>
      <RoiFrameNavigation
        changeSelection={nav.changeSelection}
        standard={props.standard}
        position={nav.position}
        scan={nav.scan}
        sectionAppearance="rail"
        selection={nav.selection}
        setSelection={nav.setSelection}
      />
      <ContrastControl
        aria-label="Contrast"
        contrast={nav.contrast}
        disabled={!nav.frame}
        frame={nav.frame}
        role="region"
        sectionAppearance="rail"
        sectionClassName="min-h-0 shrink-0"
        sectionContentClassName="flex min-h-0 flex-col"
        onContrastChange={nav.setContrast}
      />
    </>
  );
}
