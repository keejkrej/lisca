import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useShellTheme } from "../theme/shell-theme.tsx";

const DEFAULT_RAIL_WIDTH = 288;
const HEADER_HEIGHT = 64;
const DOCK_HEIGHT = 176;

function ShellScrollRegion(props: { children?: ReactNode; style?: object; contentStyle?: object }) {
  return (
    <ScrollView
      style={[{ flex: 1 }, props.style]}
      contentContainerStyle={[{ flexGrow: 1 }, props.contentStyle]}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {props.children}
    </ScrollView>
  );
}

function AppShellRoot(props: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        {props.children}
      </SafeAreaView>
    </View>
  );
}

function Header(props: { children?: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View
      style={[
        styles.header,
        { borderBottomColor: colors.border, backgroundColor: colors.background, maxHeight: HEADER_HEIGHT },
      ]}
    >
      <ShellScrollRegion contentStyle={styles.headerContent}>{props.children}</ShellScrollRegion>
    </View>
  );
}

function Body(props: { children?: ReactNode }) {
  return <View style={styles.body}>{props.children}</View>;
}

function Left(props: { children?: ReactNode; width?: number }) {
  const { colors } = useShellTheme();
  const width = props.width ?? DEFAULT_RAIL_WIDTH;
  return (
    <View
      style={[
        styles.rail,
        styles.railLeft,
        {
          width,
          borderRightColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <ShellScrollRegion contentStyle={styles.railContent}>{props.children}</ShellScrollRegion>
    </View>
  );
}

function Right(props: { children?: ReactNode; width?: number }) {
  const { colors } = useShellTheme();
  const width = props.width ?? DEFAULT_RAIL_WIDTH;
  return (
    <View
      style={[
        styles.rail,
        styles.railRight,
        {
          width,
          borderLeftColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <ShellScrollRegion contentStyle={styles.railContent}>{props.children}</ShellScrollRegion>
    </View>
  );
}

function MainColumn(props: { children?: ReactNode }) {
  return <View style={styles.mainColumn}>{props.children}</View>;
}

function Main(props: { children?: ReactNode }) {
  return (
    <View style={styles.main}>
      <ShellScrollRegion contentStyle={styles.mainContent}>{props.children}</ShellScrollRegion>
    </View>
  );
}

function Dock(props: { children?: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.dock, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      <SafeAreaView edges={["bottom"]} style={styles.dockSafeArea}>
        <ShellScrollRegion contentStyle={styles.dockContent}>{props.children}</ShellScrollRegion>
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

export function ShellSidebar(props: { children?: ReactNode; side?: "left" | "right"; width?: number }) {
  return props.side === "right" ? (
    <Right width={props.width}>{props.children}</Right>
  ) : (
    <Left width={props.width}>{props.children}</Left>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    height: HEADER_HEIGHT,
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: 12,
  },
  headerContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: HEADER_HEIGHT - 2,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  rail: {
    minHeight: 0,
  },
  railLeft: {
    borderRightWidth: 1,
  },
  railRight: {
    borderLeftWidth: 1,
  },
  railContent: {
    gap: 8,
    padding: 12,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  main: {
    flex: 1,
    minHeight: 0,
  },
  mainContent: {
    flexGrow: 1,
  },
  dock: {
    borderTopWidth: 1,
    height: DOCK_HEIGHT,
    minHeight: DOCK_HEIGHT,
    maxHeight: DOCK_HEIGHT,
  },
  dockSafeArea: {
    flex: 1,
  },
  dockContent: {
    flexGrow: 1,
    minHeight: DOCK_HEIGHT - 2,
  },
});
