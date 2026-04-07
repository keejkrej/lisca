import { createTauriDesktopPorts } from "lisca/viewer/host-tauri";
import { ViewerApp } from "lisca/viewer/react";

const ports = createTauriDesktopPorts();

export default function App() {
  return <ViewerApp dataPort={ports.dataPort} hostPort={ports.hostPort} />;
}
