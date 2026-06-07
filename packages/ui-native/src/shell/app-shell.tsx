import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useShellTheme } from "../theme/shell-theme.tsx";

function ShellRegion(props: { children?: ReactNode; style?: object }) {
  return <View style={props.style}>{props.children}</View>;
}

function AppShellRoot(props: { children: ReactNode }) {
  const { colors } = useShellTheme();
  return <View style={[styles.root, { backgroundColor: colors.background }]}>{props.children}</View>;
}

function Header(props: { children?: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.panel }]}>
      {props.children}
    </View>
  );
}

function Body(props: { children?: ReactNode }) {
  return <View style={styles.body}>{props.children}</View>;
}

function Left(props: { children?: ReactNode; width?: number }) {
  const { colors } = useShellTheme();
  return (
    <View
      style={[
        styles.left,
        { width: props.width ?? 280, borderRightColor: colors.border, backgroundColor: colors.panel },
      ]}
    >
      {props.children}
    </View>
  );
}

function Right(props: { children?: ReactNode; width?: number }) {
  const { colors } = useShellTheme();
  return (
    <View
      style={[
        styles.right,
        { width: props.width ?? 280, borderLeftColor: colors.border, backgroundColor: colors.panel },
      ]}
    >
      {props.children}
    </View>
  );
}

function MainColumn(props: { children?: ReactNode }) {
  return <View style={styles.mainColumn}>{props.children}</View>;
}

function Main(props: { children?: ReactNode }) {
  return <View style={styles.main}>{props.children}</View>;
}

function Dock(props: { children?: ReactNode }) {
  const { colors } = useShellTheme();
  return (
    <View style={[styles.dock, { borderTopColor: colors.border, backgroundColor: colors.panel }]}>
      {props.children}
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
  return props.side === "right" ? <Right width={props.width}>{props.children}</Right> : <Left width={props.width}>{props.children}</Left>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  left: {
    borderRightWidth: 1,
    minHeight: 0,
  },
  right: {
    borderLeftWidth: 1,
    minHeight: 0,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  main: {
    flex: 1,
    minHeight: 0,
    padding: 8,
  },
  dock: {
    borderTopWidth: 1,
    minHeight: 88,
    maxHeight: 120,
  },
});
