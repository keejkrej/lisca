import { formatNavigationOptionDisplayLabel, type NavigationOption, type NavigationValue } from "@lisca/utils";
import { Check, ChevronsUpDown } from "lucide-react-native";
import { useEffect, useId, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { Portal } from "@rn-primitives/portal";

import { Icon } from "../../../components/ui/icon";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const LIST_MAX_HEIGHT = 240;
const LIST_GAP = 4;

export function SelectPicker<T extends NavigationValue>(props: {
  value: T;
  options: NavigationOption<T>[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const triggerRef = useRef<View>(null);
  const portalName = useId().replace(/:/g, "");
  const selected = props.options.find((option) => option.value === props.value);

  const measureAnchor = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };

  const close = () => setOpen(false);

  const openPicker = () => {
    if (props.disabled) return;
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    const frame = requestAnimationFrame(() => {
      measureAnchor();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const dropdownStyle = (() => {
    if (!anchor) return null;
    const screenHeight = Dimensions.get("window").height;
    const belowTop = anchor.y + anchor.height + LIST_GAP;
    const flip = belowTop + LIST_MAX_HEIGHT > screenHeight - 16;
    const top = flip ? Math.max(8, anchor.y - LIST_MAX_HEIGHT - LIST_GAP) : belowTop;
    return {
      top,
      left: anchor.x,
      width: anchor.width,
      maxHeight: LIST_MAX_HEIGHT,
    } satisfies ViewStyle;
  })();

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityRole="combobox"
        accessibilityState={{ disabled: Boolean(props.disabled), expanded: open }}
        className={cn(
          "h-7 min-h-7 min-w-0 w-full flex-row items-center justify-between gap-1.5 rounded-lg border border-input bg-background px-[9px] shadow-sm shadow-black/5",
          props.disabled && Platform.OS !== "web" && "opacity-64",
        )}
        disabled={props.disabled}
        style={props.disabled ? { opacity: 0.64 } : undefined}
        onPress={openPicker}
      >
        <Text className="min-w-0 flex-1 text-sm text-foreground" numberOfLines={1}>
          {selected ? formatNavigationOptionDisplayLabel(selected.label) : String(props.value)}
        </Text>
        <Icon as={ChevronsUpDown} className="size-4 shrink-0 opacity-80" size={16} strokeWidth={2} />
      </Pressable>

      {open && anchor && dropdownStyle ? (
        <Portal name={portalName}>
          <Pressable
            accessibilityLabel="Dismiss"
            className={cn(Platform.OS === "web" && "fixed inset-0 z-40")}
            style={Platform.OS === "web" ? undefined : StyleSheet.absoluteFillObject}
            onPress={close}
          />
          <View
            className="absolute z-50 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
            style={dropdownStyle}
          >
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {props.options.map((option) => {
                const isSelected = option.value === props.value;
                return (
                  <Pressable
                    key={String(option.value)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    className={cn(
                      "min-h-7 flex-row items-center gap-2 rounded-sm py-1 pl-2 pr-4 active:bg-accent",
                      isSelected && "bg-accent",
                    )}
                    onPress={() => {
                      props.onChange(option.value);
                      close();
                    }}
                  >
                    <View className="w-4 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <Icon as={Check} className="size-4 text-foreground" size={16} strokeWidth={2} />
                      ) : null}
                    </View>
                    <Text className="min-w-0 flex-1 text-sm text-foreground">
                      {formatNavigationOptionDisplayLabel(option.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Portal>
      ) : null}
    </>
  );
}
