import { createTauriDesktopPorts } from "lisca/annotator/host-tauri";
import { AnnotatorApp } from "lisca/annotator/react";

const ports = createTauriDesktopPorts();

export default function App() {
  return <AnnotatorApp dataPort={ports.dataPort} hostPort={ports.hostPort} />;
}
