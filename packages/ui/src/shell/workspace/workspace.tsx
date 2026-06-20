import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";

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

const ShellWorkspaceStateContext = createContext<WorkspaceState | null>(null);
const ShellWorkspaceActionsContext = createContext<Pick<
  ShellWorkspace,
  "setWorkspacePath" | "setSourcePath" | "pickWorkspace" | "pickSource" | "clearSource"
> | null>(null);

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

function createWorkspaceActions(
  dispatch: Dispatch<WorkspaceAction>,
  stateRef: { current: WorkspaceState },
) {
  return {
    setWorkspacePath: (path: string | null) => dispatch({ type: "setWorkspacePath", path }),
    setSourcePath: (path: string | null) => dispatch({ type: "setSourcePath", path }),
    clearSource: () => dispatch({ type: "clearSource" }),
    pickWorkspace: () => {
      const next = window.prompt("Workspace folder path (dev stub)");
      const trimmed = next?.trim();
      dispatch({ type: "setWorkspacePath", path: trimmed ? trimmed : null });
    },
    pickSource: () => {
      if (!stateRef.current.workspacePath) return;
      const next = window.prompt("Image source path (dev stub)");
      const trimmed = next?.trim();
      dispatch({ type: "setSourcePath", path: trimmed ? trimmed : null });
    },
  };
}

/** Dev stub paths via `window.prompt`; swap for native pickers in desktop shells. */
export function ShellWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    workspacePath: null,
    sourcePath: null,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const actionsRef = useRef<ReturnType<typeof createWorkspaceActions>>(null!);
  if (!actionsRef.current) {
    actionsRef.current = createWorkspaceActions(dispatch, stateRef);
  }
  useEffect(() => {
    if (!state.workspacePath && state.sourcePath) {
      dispatch({ type: "clearSource" });
    }
  }, [state.sourcePath, state.workspacePath]);

  return (
    <ShellWorkspaceActionsContext.Provider value={actionsRef.current}>
      <ShellWorkspaceStateContext.Provider value={state}>
        {children}
      </ShellWorkspaceStateContext.Provider>
    </ShellWorkspaceActionsContext.Provider>
  );
}

export function useShellWorkspace(): ShellWorkspace {
  const state = useContext(ShellWorkspaceStateContext);
  const actions = useContext(ShellWorkspaceActionsContext);
  if (!state || !actions) {
    throw new Error("useShellWorkspace must be used within ShellWorkspaceProvider");
  }
  return { ...state, ...actions };
}
