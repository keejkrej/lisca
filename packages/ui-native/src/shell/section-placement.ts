import type { ViewStyle } from "react-native";

export const sidebarSectionStyle: ViewStyle = {
  minHeight: 0,
  flexShrink: 0,
};

export const sidebarSectionContentStyle: ViewStyle = {
  flexDirection: "column",
  gap: 8,
  minHeight: 0,
};

export const dockSectionStyle: ViewStyle = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: "100%",
};

export const dockSectionContentStyle: ViewStyle = {
  flex: 1,
  minHeight: 0,
  alignItems: "center",
  justifyContent: "center",
};

export const sidebarStackStyle: ViewStyle = {
  flexDirection: "column",
  gap: 8,
  minHeight: 0,
  overflow: "hidden",
  padding: 12,
};
