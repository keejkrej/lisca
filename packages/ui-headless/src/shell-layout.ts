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

/** Two 256px rails plus a 512px minimum viable scientific workspace. */
export const STAGE_SHELL_INLINE_MIN_WIDTH = 1024;

/** True when the viewport is square or taller than it is wide. */
export function isPortraitViewport(width: number, height: number): boolean {
  return height >= width;
}

/** Stage rails overlay when orientation or available width would starve the center workspace. */
export function isStageOverlayViewport(width: number, height: number): boolean {
  return isPortraitViewport(width, height) || width < STAGE_SHELL_INLINE_MIN_WIDTH;
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
