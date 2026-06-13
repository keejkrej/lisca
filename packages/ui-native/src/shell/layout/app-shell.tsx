import type { ReactNode } from "react";
import { ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "../../../lib/utils";

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

function AppShellRoot(props: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
        {props.children}
      </SafeAreaView>
    </View>
  );
}

function Header(props: { children?: ReactNode }) {
  return (
    <View
      className="h-16 min-h-16 max-h-16 border-b border-border bg-background px-3"
      style={{ maxHeight: HEADER_HEIGHT }}
    >
      <ShellScrollRegion contentClassName="min-h-[62px] flex-grow justify-center">
        {props.children}
      </ShellScrollRegion>
    </View>
  );
}

function Body(props: { children?: ReactNode }) {
  return <View className="min-h-0 flex-1 flex-row bg-background">{props.children}</View>;
}

function Left(props: { children?: ReactNode; width?: number }) {
  const width = props.width ?? DEFAULT_RAIL_WIDTH;
  return (
    <View className="min-h-0 border-r border-border bg-background" style={{ width }}>
      <ShellScrollRegion contentClassName="flex-grow">{props.children}</ShellScrollRegion>
    </View>
  );
}

function Right(props: { children?: ReactNode; width?: number }) {
  const width = props.width ?? DEFAULT_RAIL_WIDTH;
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
    <View nativeID="main-content" className="min-h-0 flex-1 bg-background">
      <ShellScrollRegion contentClassName="flex-grow">{props.children}</ShellScrollRegion>
    </View>
  );
}

function Dock(props: { children?: ReactNode }) {
  return (
    <View
      className="h-44 min-h-44 max-h-44 border-t border-border bg-background"
      style={{ height: DOCK_HEIGHT, minHeight: DOCK_HEIGHT, maxHeight: DOCK_HEIGHT }}
    >
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <ShellScrollRegion contentClassName="min-h-[174px] flex-grow">
          {props.children}
        </ShellScrollRegion>
      </SafeAreaView>
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
