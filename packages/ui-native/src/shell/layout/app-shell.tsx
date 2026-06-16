import type { ReactNode } from "react";
import { useEffect, useId } from "react";
import { Platform, ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "../../../lib/utils";
import { ShellLayoutProvider, useShellLayout } from "./shell-layout-context";
import {
  ShellPortraitPanelControls,
  ShellPortraitPanelOverlays,
} from "./shell-portrait-panels";

const DEFAULT_RAIL_WIDTH = 288;
const HEADER_HEIGHT = 64;
const DOCK_HEIGHT = 176;

function ShellScrollRegion(props: {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: ViewProps["style"];
  contentStyle?: ViewProps["style"];
}) {
  return (
    <ScrollView
      className={cn("flex-1", props.className)}
      contentContainerClassName={cn("flex-grow", props.contentClassName)}
      contentContainerStyle={props.contentStyle}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      style={props.style}
    >
      {props.children}
    </ScrollView>
  );
}

function useRegisterShellPanel(props: {
  side: "left" | "right";
  children?: ReactNode;
  width?: number;
}) {
  const layout = useShellLayout();
  const id = useId();
  const width = props.width ?? DEFAULT_RAIL_WIDTH;

  useEffect(() => {
    if (!layout.isPortrait) {
      return undefined;
    }
    const register =
      props.side === "left" ? layout.registerLeftPanel : layout.registerRightPanel;
    return register({
      id,
      width,
      content: props.children,
    });
  }, [
    id,
    layout.isPortrait,
    layout.registerLeftPanel,
    layout.registerRightPanel,
    props.children,
    props.side,
    width,
  ]);
}

function AppShellRoot(props: { children: ReactNode }) {
  return (
    <ShellLayoutProvider>
      <View className="flex-1 bg-background">
        <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
          {props.children}
        </SafeAreaView>
      </View>
    </ShellLayoutProvider>
  );
}

function Header(props: { children?: ReactNode }) {
  return (
    <View
      className="h-16 min-h-16 max-h-16 border-b border-border bg-background px-6"
      style={{ maxHeight: HEADER_HEIGHT }}
    >
      <View className="min-h-[62px] min-w-0 w-full flex-1 justify-center">
        {props.children}
      </View>
    </View>
  );
}

function Body(props: { children?: ReactNode }) {
  return (
    <View className="relative min-h-0 flex-1 flex-row bg-background">
      {props.children}
      <ShellPortraitPanelOverlays />
    </View>
  );
}

function Left(props: { children?: ReactNode; width?: number }) {
  useRegisterShellPanel({ side: "left", children: props.children, width: props.width });
  const layout = useShellLayout();
  const width = props.width ?? DEFAULT_RAIL_WIDTH;

  if (layout.isPortrait) {
    return null;
  }

  return (
    <View className="min-h-0 border-r border-border bg-background" style={{ width }}>
      <ShellScrollRegion contentClassName="flex-grow">{props.children}</ShellScrollRegion>
    </View>
  );
}

function Right(props: { children?: ReactNode; width?: number }) {
  useRegisterShellPanel({ side: "right", children: props.children, width: props.width });
  const layout = useShellLayout();
  const width = props.width ?? DEFAULT_RAIL_WIDTH;

  if (layout.isPortrait) {
    return null;
  }

  return (
    <View className="min-h-0 border-l border-border bg-background" style={{ width }}>
      <ShellScrollRegion contentClassName="flex-grow">{props.children}</ShellScrollRegion>
    </View>
  );
}

function MainColumn(props: { children?: ReactNode }) {
  return <View className="min-h-0 min-w-0 flex-1 bg-background">{props.children}</View>;
}

function Main(props: { children?: ReactNode }) {
  return (
    <View nativeID="main-content" className="relative min-h-0 flex-1 bg-background">
      {Platform.OS === "web" ? (
        props.children
      ) : (
        <ShellScrollRegion contentClassName="flex-grow">{props.children}</ShellScrollRegion>
      )}
      <ShellPortraitPanelControls />
    </View>
  );
}

function Dock(props: { children?: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="border-t border-border bg-background" style={{ paddingBottom: insets.bottom }}>
      <View className="min-h-0 w-full" style={{ height: DOCK_HEIGHT }}>
        {props.children}
      </View>
    </View>
  );
}

export type AppShellCompound = typeof AppShellRoot & {
  Header: typeof Header;
  Body: typeof Body;
  Left: typeof Left;
  Right: typeof Right;
  MainColumn: typeof MainColumn;
  Main: typeof Main;
  Dock: typeof Dock;
};

export const AppShell: AppShellCompound = Object.assign(AppShellRoot, {
  Header,
  Body,
  Left,
  Right,
  MainColumn,
  Main,
  Dock,
});

export function ShellDock(props: { children?: ReactNode }) {
  return <Dock {...props} />;
}

export function ShellSidebar(props: {
  children?: ReactNode;
  side?: "left" | "right";
  width?: number;
}) {
  return props.side === "right" ? (
    <Right width={props.width}>{props.children}</Right>
  ) : (
    <Left width={props.width}>{props.children}</Left>
  );
}

export { useShellLayout } from "./shell-layout-context";
export { ShellPanelToggle } from "./shell-portrait-panels";
