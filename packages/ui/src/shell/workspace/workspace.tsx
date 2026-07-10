import { createContext, createEffect, useContext, type JSX } from "solid-js";
import { createStore } from "solid-js/store";

export type ShellWorkspace = {
  workspacePath: string | null;
  sourcePath: string | null;
  setWorkspacePath: (path: string | null) => void;
  setSourcePath: (path: string | null) => void;
  pickWorkspace: () => void;
  pickSource: () => void;
  clearSource: () => void;
};

type WorkspaceState = {
  workspacePath: string | null;
  sourcePath: string | null;
};

type WorkspaceAction =
  | { type: "setWorkspacePath"; path: string | null }
  | { type: "setSourcePath"; path: string | null }
  | { type: "clearSource" };

const ShellWorkspaceContext = createContext<ShellWorkspace>();

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "setWorkspacePath":
      return {
        workspacePath: action.path,
        sourcePath: action.path ? state.sourcePath : null,
      };
    case "setSourcePath":
      return { ...state, sourcePath: action.path };
    case "clearSource":
      return { ...state, sourcePath: null };
  }
}

/** Dev stub paths via `window.prompt`; swap for native pickers in desktop shells. */
export function ShellWorkspaceProvider(props: { children?: JSX.Element }) {
  const [workspace, setWorkspace] = createStore<ShellWorkspace>({
    workspacePath: null,
    sourcePath: null,
    setWorkspacePath: () => {},
    setSourcePath: () => {},
    clearSource: () => {},
    pickWorkspace: () => {},
    pickSource: () => {},
  });

  const dispatch = (action: WorkspaceAction) => {
    setWorkspace(
      workspaceReducer(
        {
          workspacePath: workspace.workspacePath,
          sourcePath: workspace.sourcePath,
        },
        action,
      ),
    );
  };

  setWorkspace({
    setWorkspacePath: (path) => dispatch({ type: "setWorkspacePath", path }),
    setSourcePath: (path) => dispatch({ type: "setSourcePath", path }),
    clearSource: () => dispatch({ type: "clearSource" }),
    pickWorkspace: () => {
      const next = window.prompt("Workspace folder path (dev stub)");
      const trimmed = next?.trim();
      dispatch({ type: "setWorkspacePath", path: trimmed ? trimmed : null });
    },
    pickSource: () => {
      if (!workspace.workspacePath) return;
      const next = window.prompt("Image source path (dev stub)");
      const trimmed = next?.trim();
      dispatch({ type: "setSourcePath", path: trimmed ? trimmed : null });
    },
  });

  createEffect(() => {
    if (!workspace.workspacePath && workspace.sourcePath) {
      dispatch({ type: "clearSource" });
    }
  });

  return (
    <ShellWorkspaceContext.Provider value={workspace}>{props.children}</ShellWorkspaceContext.Provider>
  );
}

export function useShellWorkspace(): ShellWorkspace {
  const value = useContext(ShellWorkspaceContext);
  if (!value) {
    throw new Error("useShellWorkspace must be used within ShellWorkspaceProvider");
  }
  return value;
}