import type { GestureResponderEvent } from "react-native";

export type CanvasPanResponderHandlers = {
  onBegin?: (clientX: number, clientY: number) => void;
  onMove?: (clientX: number, clientY: number) => void;
  onEnd?: (clientX: number, clientY: number) => void;
  onCancel?: (clientX: number, clientY: number) => void;
};

function primaryTouch(event: GestureResponderEvent) {
  const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent.touches[0];
  if (!touch) return null;
  return {
    clientX: touch.pageX,
    clientY: touch.pageY,
  };
}

export function canvasPanResponderProps(handlers: CanvasPanResponderHandlers) {
  return {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (event: GestureResponderEvent) => {
      const touch = primaryTouch(event);
      if (touch) handlers.onBegin?.(touch.clientX, touch.clientY);
    },
    onResponderMove: (event: GestureResponderEvent) => {
      const touch = event.nativeEvent.touches[0];
      if (!touch) return;
      handlers.onMove?.(touch.pageX, touch.pageY);
    },
    onResponderRelease: (event: GestureResponderEvent) => {
      const touch = primaryTouch(event);
      if (touch) handlers.onEnd?.(touch.clientX, touch.clientY);
    },
    onResponderTerminate: (event: GestureResponderEvent) => {
      const touch = primaryTouch(event);
      if (touch) handlers.onCancel?.(touch.clientX, touch.clientY);
    },
  };
}
