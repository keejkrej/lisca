import { createTauriDesktopPorts } from "lisca/viewer/host-tauri";
import { ViewApp } from "lisca/viewer/react";

const ports = createTauriDesktopPorts();

export default function App() {
  return <ViewApp dataPort={ports.dataPort} hostPort={ports.hostPort} />;
}
