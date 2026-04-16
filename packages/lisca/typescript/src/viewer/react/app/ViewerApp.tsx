import { useEffect, useState } from "react";
import { useStore } from "zustand";

import type { ViewerDataPort, ViewerHostPort } from "lisca/shared/contracts";
import { makeSourceKey } from "lisca/shared/core";
import { AnchoredToastProvider, ToastProvider } from "lisca/shared/react";
import { setWorkspacePath, workspaceStore } from "lisca/shared/state";

import RoiWorkspace from "./RoiWorkspace";
import ViewerWorkspace from "./ViewerWorkspace";
import type { ViewerMode } from "./ViewerNavbar";
import { setSource, viewerStore } from "./viewerStore";

interface ViewerAppProps {
  dataPort: ViewerDataPort;
  hostPort: ViewerHostPort;
}

const LAST_VIEWER_MODE_KEY = "viewer.viewerMode";

function readStoredViewerMode(): ViewerMode {
  if (typeof window === "undefined" || !window.sessionStorage) return "align";
  const stored = window.sessionStorage.getItem(LAST_VIEWER_MODE_KEY);
  return stored === "roi" ? "roi" : "align";
}

export default function ViewerApp({
  dataPort,
  hostPort,
}: ViewerAppProps) {
  const workspacePath = useStore(workspaceStore, (state) => state.workspacePath);
  const source = useStore(viewerStore, (state) => state.source);
  const [mode, setMode] = useState<ViewerMode>(() => readStoredViewerMode());

  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(LAST_VIEWER_MODE_KEY, mode);
  }, [mode]);

  const handlePickWorkspace = async () => {
    const selected = await hostPort.pickWorkspace();
    if (selected) setWorkspacePath(selected);
  };

  const handlePickTif = async () => {
    if (!workspacePath) return;
    const selected = await hostPort.pickTifDirectory();
    if (selected) setSource({ kind: "tif", path: selected });
  };

  const handlePickNd2 = async () => {
    if (!workspacePath) return;
    const selected = await hostPort.pickNd2File();
    if (selected) setSource({ kind: "nd2", path: selected });
  };

  const handlePickCzi = async () => {
    if (!workspacePath) return;
    const selected = await hostPort.pickCziFile();
    if (selected) setSource({ kind: "czi", path: selected });
  };

  const workspace = (
    mode === "align" ? (
      <ViewerWorkspace
        key={source ? `align:${makeSourceKey(source)}` : "align:no-source"}
        workspacePath={workspacePath}
        source={source}
        backend={dataPort}
        mode={mode}
        onModeChange={setMode}
        onPickWorkspace={handlePickWorkspace}
        onOpenTif={handlePickTif}
        onOpenNd2={handlePickNd2}
        onOpenCzi={handlePickCzi}
        onCheckRoiExists={hostPort.roiPosExists}
        onClearSource={() => setSource(null)}
      />
    ) : (
      <RoiWorkspace
        key="roi-workspace"
        workspacePath={workspacePath}
        source={source}
        backend={dataPort}
        mode={mode}
        onModeChange={setMode}
        onPickWorkspace={handlePickWorkspace}
        onOpenTif={handlePickTif}
        onOpenNd2={handlePickNd2}
        onOpenCzi={handlePickCzi}
        onClearSource={() => setSource(null)}
      />
    )
  );

  return (
    <ToastProvider>
      <AnchoredToastProvider>
        <div className="h-full overflow-hidden bg-background">
          {workspace}
        </div>
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
