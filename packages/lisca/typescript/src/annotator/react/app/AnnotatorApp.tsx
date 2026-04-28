import type { ViewerDataPort, ViewerHostPort } from "lisca/shared/contracts";
import type { AnnotationMode } from "lisca/shared/contracts";
import { AnchoredToastProvider, ToastProvider } from "lisca/shared/react";

import AnnotatorWorkspace from "./AnnotatorWorkspace";
import type { AnnotatorDataMode } from "./AnnotatorNavbar";

interface AnnotatorAppProps {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
  dataMode?: AnnotatorDataMode;
  annotationMode?: AnnotationMode;
  onDataModeChange?: (mode: AnnotatorDataMode) => void;
  onAnnotationModeChange?: (mode: AnnotationMode) => void;
}

export default function AnnotatorApp({
  dataPort,
  hostPort,
  dataMode,
  annotationMode,
  onDataModeChange,
  onAnnotationModeChange,
}: AnnotatorAppProps) {
  return (
    <ToastProvider>
      <AnchoredToastProvider>
        <AnnotatorWorkspace
          dataPort={dataPort}
          hostPort={hostPort}
          dataMode={dataMode}
          annotationMode={annotationMode}
          onDataModeChange={onDataModeChange}
          onAnnotationModeChange={onAnnotationModeChange}
        />
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
