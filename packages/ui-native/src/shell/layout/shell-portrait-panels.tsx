import { Menu, PanelRightClose } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { useShellTheme } from "../../theme/shell-theme";
import { useShellLayout } from "./shell-layout-context";

const DEFAULT_PANEL_WIDTH = 288;

export function ShellPanelToggle(props: { side: "left" | "right"; className?: string }) {
  const layout = useShellLayout();
  const { colors } = useShellTheme();
  const open = props.side === "left" ? layout.leftOpen : layout.rightOpen;
  const hasPanels = props.side === "left" ? layout.hasLeftPanels : layout.hasRightPanels;
  const toggle = props.side === "left" ? layout.toggleLeft : layout.toggleRight;

  if (!layout.isPortrait || !hasPanels) {
    return null;
  }

  const Icon = props.side === "left" ? Menu : PanelRightClose;
  const label =
    props.side === "left"
      ? open
        ? "Close left panel"
        : "Open left panel"
      : open
        ? "Close right panel"
        : "Open right panel";

  return (
    <Button
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      className={cn("shadow-sm", props.className)}
      size="sm"
      variant="outline"
      onPress={toggle}
    >
      <Icon color={colors.foreground} size={16} strokeWidth={2} />
    </Button>
  );
}

export function ShellPortraitPanelControls() {
  const layout = useShellLayout();

  if (!layout.isPortrait) {
    return null;
  }

  return (
    <>
      {layout.hasLeftPanels ? (
        <View className="absolute left-3 top-1/2 z-30 -translate-y-1/2" pointerEvents="box-none">
          <ShellPanelToggle side="left" />
        </View>
      ) : null}
      {layout.hasRightPanels ? (
        <View className="absolute right-3 top-1/2 z-30 -translate-y-1/2" pointerEvents="box-none">
          <ShellPanelToggle side="right" />
        </View>
      ) : null}
    </>
  );
}

export function ShellPortraitPanelOverlays() {
  const layout = useShellLayout();
  const scrimVisible = layout.leftOpen || layout.rightOpen;

  if (!layout.isPortrait) {
    return null;
  }

  return (
    <>
      {scrimVisible ? (
        <Pressable
          accessibilityLabel="Close side panels"
          className="absolute inset-0 z-40 bg-black/55"
          onPress={layout.closePanels}
        />
      ) : null}
      {layout.hasLeftPanels ? (
        <View
          accessibilityElementsHidden={!layout.leftOpen}
          accessibilityLabel="Left panel"
          className={cn(
            "absolute inset-y-0 left-0 z-50 max-w-[85%] border-r border-border bg-background shadow-xl",
            layout.leftOpen ? "opacity-100" : "opacity-0",
          )}
          pointerEvents={layout.leftOpen ? "auto" : "none"}
          style={{ width: Math.min(layout.leftPanels.reduce((max, panel) => Math.max(max, panel.width ?? DEFAULT_PANEL_WIDTH), DEFAULT_PANEL_WIDTH), 320) }}
        >
          <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
            {layout.leftPanels.map((panel) => (
              <View key={panel.id} style={{ width: panel.width ?? DEFAULT_PANEL_WIDTH }}>
                {panel.content}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
      {layout.hasRightPanels ? (
        <View
          accessibilityElementsHidden={!layout.rightOpen}
          accessibilityLabel="Right panel"
          className={cn(
            "absolute inset-y-0 right-0 z-50 max-w-[85%] border-l border-border bg-background shadow-xl",
            layout.rightOpen ? "opacity-100" : "opacity-0",
          )}
          pointerEvents={layout.rightOpen ? "auto" : "none"}
          style={{ width: Math.min(layout.rightPanels.reduce((max, panel) => Math.max(max, panel.width ?? DEFAULT_PANEL_WIDTH), DEFAULT_PANEL_WIDTH), 320) }}
        >
          <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
            {layout.rightPanels.map((panel) => (
              <View key={panel.id} style={{ width: panel.width ?? DEFAULT_PANEL_WIDTH }}>
                {panel.content}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}
