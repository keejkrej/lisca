import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ShellWorkspace = {
  workspacePath: string | null;
  sourcePath: string | null;
  pickWorkspace: () => void;
  pickSource: () => void;
  clearSource: () => void;
};

const ShellWorkspaceContext = createContext<ShellWorkspace | null>(null);

/** Dev stub paths via `window.prompt`; swap for native pickers in desktop shells. */
export function ShellWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [sourcePath, setSourcePath] = useState<string | null>(null);

  const pickWorkspace = useCallback(() => {
    const next = window.prompt("Workspace folder path (dev stub)");
    const trimmed = next?.trim();
    setWorkspacePath(trimmed ? trimmed : null);
  }, []);

  const pickSource = useCallback(() => {
    if (!workspacePath) return;
    const next = window.prompt("Image source path (dev stub)");
    const trimmed = next?.trim();
    setSourcePath(trimmed ? trimmed : null);
  }, [workspacePath]);

  const clearSource = useCallback(() => setSourcePath(null), []);

  useEffect(() => {
    if (!workspacePath) setSourcePath(null);
  }, [workspacePath]);

  const value = useMemo(
    () => ({
      workspacePath,
      sourcePath,
      pickWorkspace,
      pickSource,
      clearSource,
    }),
    [workspacePath, sourcePath, pickWorkspace, pickSource, clearSource],
  );

  return (
    <ShellWorkspaceContext.Provider value={value}>{children}</ShellWorkspaceContext.Provider>
  );
}

export function useShellWorkspace(): ShellWorkspace {
  const ctx = useContext(ShellWorkspaceContext);
  if (!ctx) {
    throw new Error("useShellWorkspace must be used within ShellWorkspaceProvider");
  }
  return ctx;
}
