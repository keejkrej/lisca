import {
  initialShellLayoutPanelState,
  isPortraitViewport,
  shellLayoutReducer,
} from "@lisca/ui-headless/shell-layout";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { useWindowDimensions } from "react-native";

export type ShellRegisteredPanel = {
  id: string;
  width?: number;
  content: ReactNode;
};

export type ShellLayoutContextValue = {
  isPortrait: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  hasLeftPanels: boolean;
  hasRightPanels: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  closePanels: () => void;
  registerLeftPanel: (panel: ShellRegisteredPanel) => () => void;
  registerRightPanel: (panel: ShellRegisteredPanel) => () => void;
  leftPanels: ShellRegisteredPanel[];
  rightPanels: ShellRegisteredPanel[];
};

const ShellLayoutContext = createContext<ShellLayoutContextValue | null>(null);

function upsertPanel(
  panels: ShellRegisteredPanel[],
  panel: ShellRegisteredPanel,
): ShellRegisteredPanel[] {
  const next = panels.filter((entry) => entry.id !== panel.id);
  next.push(panel);
  return next;
}

function removePanel(panels: ShellRegisteredPanel[], id: string): ShellRegisteredPanel[] {
  return panels.filter((entry) => entry.id !== id);
}

export function ShellLayoutProvider(props: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const isPortrait = isPortraitViewport(width, height);
  const [panelState, dispatch] = useReducer(shellLayoutReducer, initialShellLayoutPanelState);
  const [leftPanels, setLeftPanels] = useState<ShellRegisteredPanel[]>([]);
  const [rightPanels, setRightPanels] = useState<ShellRegisteredPanel[]>([]);

  useEffect(() => {
    dispatch({ type: "portrait-changed", isPortrait });
  }, [isPortrait]);

  const toggleLeft = useCallback(() => dispatch({ type: "toggle-left" }), []);
  const toggleRight = useCallback(() => dispatch({ type: "toggle-right" }), []);
  const closePanels = useCallback(() => dispatch({ type: "close" }), []);
  const registerLeftPanel = useCallback((panel: ShellRegisteredPanel) => {
    setLeftPanels((current) => upsertPanel(current, panel));
    return () => setLeftPanels((current) => removePanel(current, panel.id));
  }, []);
  const registerRightPanel = useCallback((panel: ShellRegisteredPanel) => {
    setRightPanels((current) => upsertPanel(current, panel));
    return () => setRightPanels((current) => removePanel(current, panel.id));
  }, []);

  const value: ShellLayoutContextValue = {
    isPortrait,
    leftOpen: panelState.leftOpen,
    rightOpen: panelState.rightOpen,
    hasLeftPanels: leftPanels.length > 0,
    hasRightPanels: rightPanels.length > 0,
    toggleLeft,
    toggleRight,
    closePanels,
    registerLeftPanel,
    registerRightPanel,
    leftPanels,
    rightPanels,
  };

  return <ShellLayoutContext value={value}>{props.children}</ShellLayoutContext>;
}

export function useShellLayout(): ShellLayoutContextValue {
  const value = useContext(ShellLayoutContext);
  if (!value) {
    throw new Error("useShellLayout must be used within AppShell");
  }
  return value;
}
