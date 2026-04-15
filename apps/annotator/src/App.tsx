import { createTauriDesktopPorts } from "lisca/viewer/host-tauri";
import { AnnotatorApp } from "lisca/viewer/react";

const ports = createTauriDesktopPorts();

export default function App() {
  return <AnnotatorApp dataPort={ports.dataPort} hostPort={ports.hostPort} />;
}
