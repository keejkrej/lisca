export type ShellLayoutPanelState = {
  leftOpen: boolean;
  rightOpen: boolean;
};

export type ShellLayoutAction =
  | { type: "toggle-left" }
  | { type: "toggle-right" }
  | { type: "close" }
  | { type: "portrait-changed"; isPortrait: boolean };

export const initialShellLayoutPanelState: ShellLayoutPanelState = {
  leftOpen: false,
  rightOpen: false,
};

/** True when the viewport is taller than it is wide. */
export function isPortraitViewport(width: number, height: number): boolean {
  return height > width;
}

export function shellLayoutReducer(
  state: ShellLayoutPanelState,
  action: ShellLayoutAction,
): ShellLayoutPanelState {
  switch (action.type) {
    case "toggle-left":
      return state.leftOpen
        ? { leftOpen: false, rightOpen: false }
        : { leftOpen: true, rightOpen: false };
    case "toggle-right":
      return state.rightOpen
        ? { leftOpen: false, rightOpen: false }
        : { leftOpen: false, rightOpen: true };
    case "close":
      return { leftOpen: false, rightOpen: false };
    case "portrait-changed":
      return action.isPortrait ? { leftOpen: false, rightOpen: false } : state;
    default:
      return state;
  }
}
