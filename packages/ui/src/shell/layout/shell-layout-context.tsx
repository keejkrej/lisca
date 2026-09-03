import {
  initialShellLayoutPanelState,
  isStageOverlayViewport,
  shellLayoutReducer,
  STAGE_SHELL_INLINE_MIN_WIDTH,
} from "@lisca/ui-headless/shell-layout";
import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";

export type ShellRegisteredPanel = {
  id: string;
  widthClass?: string;
  content: JSX.Element;
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

const ShellLayoutContext = createContext<ShellLayoutContextValue>();

function useOverlayViewport(): () => boolean {
  const resolve = () => isStageOverlayViewport(window.innerWidth, window.innerHeight);
  const [isPortrait, setIsPortrait] = createSignal(
    typeof window === "undefined" ? false : resolve(),
  );

  onMount(() => {
    const media = [
      window.matchMedia("(max-aspect-ratio: 1/1)"),
      window.matchMedia(`(max-width: ${STAGE_SHELL_INLINE_MIN_WIDTH - 1}px)`),
    ];
    const update = () => setIsPortrait(resolve());
    update();
    for (const query of media) query.addEventListener("change", update);
    onCleanup(() => {
      for (const query of media) query.removeEventListener("change", update);
    });
  });

  return isPortrait;
}

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

export function ShellLayoutProvider(props: { children?: JSX.Element }) {
  const isPortrait = useOverlayViewport();
  const [panelState, setPanelState] = createSignal(initialShellLayoutPanelState);

  const dispatchPanel = (action: Parameters<typeof shellLayoutReducer>[1]) => {
    setPanelState((current) => shellLayoutReducer(current, action));
  };

  createEffect(() => {
    dispatchPanel({ type: "portrait-changed", isPortrait: isPortrait() });
  });

  const [layout, setLayout] = createStore<ShellLayoutContextValue>({
    isPortrait: isPortrait(),
    leftOpen: panelState().leftOpen,
    rightOpen: panelState().rightOpen,
    hasLeftPanels: false,
    hasRightPanels: false,
    leftPanels: [],
    rightPanels: [],
    toggleLeft: () => dispatchPanel({ type: "toggle-left" }),
    toggleRight: () => dispatchPanel({ type: "toggle-right" }),
    closePanels: () => dispatchPanel({ type: "close" }),
    registerLeftPanel: (panel) => {
      setLayout("leftPanels", (current) => {
        const next = upsertPanel(current, panel);
        setLayout("hasLeftPanels", next.length > 0);
        return next;
      });
      return () => {
        setLayout("leftPanels", (current) => {
          const next = removePanel(current, panel.id);
          setLayout("hasLeftPanels", next.length > 0);
          return next;
        });
      };
    },
    registerRightPanel: (panel) => {
      setLayout("rightPanels", (current) => {
        const next = upsertPanel(current, panel);
        setLayout("hasRightPanels", next.length > 0);
        return next;
      });
      return () => {
        setLayout("rightPanels", (current) => {
          const next = removePanel(current, panel.id);
          setLayout("hasRightPanels", next.length > 0);
          return next;
        });
      };
    },
  });

  createEffect(() => {
    setLayout("isPortrait", isPortrait());
  });

  createEffect(() => {
    const state = panelState();
    setLayout({
      leftOpen: state.leftOpen,
      rightOpen: state.rightOpen,
    });
  });

  return <ShellLayoutContext.Provider value={layout}>{props.children}</ShellLayoutContext.Provider>;
}

export function useShellLayout(): ShellLayoutContextValue {
  const value = useContext(ShellLayoutContext);
  if (!value) {
    throw new Error("useShellLayout must be used within AppShell");
  }
  return value;
}
