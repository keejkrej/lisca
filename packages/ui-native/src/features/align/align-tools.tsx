import type { AlignGridToolMode } from "@lisca/utils";
import {
  alignToolDefinitions as headlessAlignToolDefinitions,
  buildAlignToolActions,
} from "@lisca/ui-headless/align-tools";
import {
  ArrowLeftRight,
  Lock,
  Move,
  RotateCw,
  SquareDashedMousePointer,
  Unlock,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "../../../components/ui/button";
import { Icon } from "../../../components/ui/icon";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import { dockToolLabel, dockToolShortcuts, keyboardShortcutsSupported, useKeyboardShortcuts } from "../../shell";
import { DockSection } from "../../shell/regions/dock-section";
import { dockLayoutClasses, dockSectionWidths } from "../../shell/regions/dock-layout";
import { useThemeColors } from "../../theme/use-theme-colors";

function PatternZoomLockButton(props: {
  locked: boolean;
  onToggle?: () => void;
}) {
  const colors = useThemeColors();
  const LockIcon = props.locked ? Lock : Unlock;

  return (
    <Button
      key={props.locked ? "locked" : "unlocked"}
      accessibilityLabel={props.locked ? "Unlock pattern zoom" : "Lock pattern zoom"}
      accessibilityState={{ selected: props.locked }}
      className="w-8 shrink-0 px-0 sm:w-7"
      disabled={!props.onToggle}
      size="sm"
      variant={props.locked ? "default" : "outline"}
      onPress={props.onToggle}
    >
      <LockIcon
        color={props.locked ? colors.primaryForeground : colors.foreground}
        size={16}
        strokeWidth={2}
      />
    </Button>
  );
}

export type AlignToolSectionProps = {
  mode: AlignGridToolMode;
  onModeChange: (mode: AlignGridToolMode) => void;
  patternZoomLocked?: boolean;
  onPatternZoomLockedChange?: (locked: boolean) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionStyle?: object;
  sectionContentStyle?: object;
  sectionClassName?: string;
  sectionContentClassName?: string;
  shortcutsEnabled?: boolean;
};

const alignToolIcons: Partial<Record<AlignGridToolMode, LucideIcon>> = {
  pan: Move,
  rotate: RotateCw,
  "zoom-vector": ArrowLeftRight,
  "zoom-pattern": SquareDashedMousePointer,
};

export const alignToolDefinitions = headlessAlignToolDefinitions.map(({ mode, label }) => ({
  mode,
  label,
  Icon: alignToolIcons[mode] ?? SquareDashedMousePointer,
}));

export { buildAlignToolActions };

export function AlignToolButton(props: {
  mode: AlignGridToolMode;
  active: boolean;
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  className?: string;
}) {
  const { active, label, Icon: ToolIcon, onPress, className } = props;

  return (
    <Button
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className={className ?? "w-full min-w-0 justify-center gap-2 px-3"}
      size="sm"
      variant={active ? "default" : "outline"}
      onPress={onPress}
    >
      <Icon as={ToolIcon} size={20} strokeWidth={2} />
      <Text
        className={cn("max-w-full shrink truncate text-xs", active && "text-primary-foreground")}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Button>
  );
}

function renderAlignToolCell(
  tool: (typeof alignToolDefinitions)[number],
  index: number,
  mode: AlignGridToolMode,
  onModeChange: (mode: AlignGridToolMode) => void,
  patternZoomLocked: boolean,
  onPatternZoomLockedChange: ((locked: boolean) => void) | undefined,
  showShortcutLabels: boolean,
) {
  const label = showShortcutLabels ? dockToolLabel(tool.label, index) : tool.label;

  if (tool.mode === "zoom-pattern") {
    return (
      <View key={tool.mode} className={dockLayoutClasses.cell}>
        <View className="min-w-0 w-full flex-row items-stretch gap-1">
          <View className="min-w-0 flex-1">
            <AlignToolButton
              active={mode === tool.mode}
              className="min-w-0 w-full justify-center gap-2 px-2"
              Icon={tool.Icon}
              label={label}
              mode={tool.mode}
              onPress={() => onModeChange(tool.mode)}
            />
          </View>
          <View className="shrink-0">
            <PatternZoomLockButton
              locked={patternZoomLocked}
              onToggle={
                onPatternZoomLockedChange
                  ? () => onPatternZoomLockedChange(!patternZoomLocked)
                  : undefined
              }
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View key={tool.mode} className={dockLayoutClasses.cell}>
      <AlignToolButton
        active={mode === tool.mode}
        Icon={tool.Icon}
        label={label}
        mode={tool.mode}
        onPress={() => onModeChange(tool.mode)}
      />
    </View>
  );
}

export type AlignToolToolbarProps = Pick<
  AlignToolSectionProps,
  | "mode"
  | "onModeChange"
  | "patternZoomLocked"
  | "onPatternZoomLockedChange"
  | "shortcutsEnabled"
>;

export function AlignToolToolbar({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
  shortcutsEnabled = true,
}: AlignToolToolbarProps) {
  const toolActions = buildAlignToolActions(mode, onModeChange);
  const showShortcutLabels = keyboardShortcutsSupported && shortcutsEnabled;
  useKeyboardShortcuts(dockToolShortcuts(toolActions), { enabled: showShortcutLabels });

  const cells = alignToolDefinitions.map((tool, index) =>
    renderAlignToolCell(
      tool,
      index,
      mode,
      onModeChange,
      patternZoomLocked,
      onPatternZoomLockedChange,
      showShortcutLabels,
    ),
  );

  return (
    <View accessibilityLabel="Align canvas tool" accessibilityRole="toolbar" className={dockLayoutClasses.toolbar}>
      <View className={dockLayoutClasses.cols2}>
        {cells[0]}
        {cells[1]}
      </View>
      <View className={dockLayoutClasses.cols2}>
        {cells[2]}
        {cells[3]}
      </View>
    </View>
  );
}

export function AlignToolSection({
  mode,
  onModeChange,
  patternZoomLocked = false,
  onPatternZoomLockedChange,
  sectionTitle = "Tool",
  sectionDescription,
  sectionStyle,
  sectionContentStyle,
  sectionClassName,
  sectionContentClassName,
  shortcutsEnabled = true,
}: AlignToolSectionProps) {
  return (
    <DockSection
      className={cn(sectionClassName ?? dockLayoutClasses.section, dockSectionWidths.tool)}
      contentClassName={sectionContentClassName ?? dockLayoutClasses.content}
      contentStyle={sectionContentStyle}
      description={sectionDescription}
      style={sectionStyle}
      title={sectionTitle}
    >
      <AlignToolToolbar
        mode={mode}
        patternZoomLocked={patternZoomLocked}
        shortcutsEnabled={shortcutsEnabled}
        onModeChange={onModeChange}
        onPatternZoomLockedChange={onPatternZoomLockedChange}
      />
    </DockSection>
  );
}
