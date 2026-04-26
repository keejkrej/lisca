import type { ViewerDataPort, ViewerHostPort } from "lisca/shared/contracts";
import { AnchoredToastProvider, ToastProvider } from "lisca/shared/react";

import AnnotatorWorkspace from "./AnnotatorWorkspace";

interface AnnotatorAppProps {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
}

export default function AnnotatorApp({ dataPort, hostPort }: AnnotatorAppProps) {
  return (
    <ToastProvider>
      <AnchoredToastProvider>
        <AnnotatorWorkspace dataPort={dataPort} hostPort={hostPort} />
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
