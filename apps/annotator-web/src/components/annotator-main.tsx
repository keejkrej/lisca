import type { ComponentProps } from "react";

import { AnnotationCanvas } from "./annotation-canvas";

type AnnotatorMainProps = ComponentProps<typeof AnnotationCanvas>;

export function AnnotatorMain(props: AnnotatorMainProps) {
  return <AnnotationCanvas {...props} />;
}
