import { cn } from "lisca/shared/ui";

import { useAnnotationModeStore } from "../app/annotationModeStore";
import AnnotationToolbarInstances from "./toolbar/AnnotationToolbarInstances";
import AnnotationToolbarLabels from "./toolbar/AnnotationToolbarLabels";
import AnnotationToolbarPaint from "./toolbar/AnnotationToolbarPaint";

export default function RoiAnnotationToolbar({ className }: { className?: string }) {
  const mode = useAnnotationModeStore((state) => state.mode);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-y-auto divide-y divide-border border-l border-border bg-background px-5 py-4",
        className,
      )}
    >
      <AnnotationToolbarLabels />
      {mode === "instance" ? <AnnotationToolbarInstances /> : null}
      {mode === "semantic" || mode === "instance" ? <AnnotationToolbarPaint /> : null}
    </aside>
  );
}
