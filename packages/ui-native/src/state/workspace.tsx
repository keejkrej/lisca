import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export type ShellWorkspace = {
  workspacePath: string | null;
  sourcePath: string | null;
  setWorkspacePath: (path: string | null) => void;
  setSourcePath: (path: string | null) => void;
  pickWorkspace: () => void;
  pickSource: () => void;
  clearSource: () => void;
};
const ShellWorkspaceContext = createContext<ShellWorkspace | null>(null);

function pickWorkspaceStub() {
  // Host file picker opens from header; this is a no-op stub for API parity.
}

export function ShellWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const pickWorkspace = pickWorkspaceStub;
  const pickSource = () => {
    if (!workspacePath) return;
  };
  const clearSource = () => setSourcePath(null);
  useEffect(() => {
    if (!workspacePath) setSourcePath(null);
  }, [workspacePath]);
  const value = {
    workspacePath,
    sourcePath,
    setWorkspacePath,
    setSourcePath,
    pickWorkspace,
    pickSource,
    clearSource,
  };
  return <ShellWorkspaceContext.Provider value={value}>{children}</ShellWorkspaceContext.Provider>;
}
export function useShellWorkspace(): ShellWorkspace {
  const ctx = useContext(ShellWorkspaceContext);
  if (!ctx) throw new Error("useShellWorkspace must be used within ShellWorkspaceProvider");
  return ctx;
}
