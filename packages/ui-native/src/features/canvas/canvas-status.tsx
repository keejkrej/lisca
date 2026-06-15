import type { CanvasStatusMessage } from "@lisca/ui-headless";
import {
  canvasToastPresentation,
  shouldHideToastText,
} from "@lisca/ui-headless/canvas-status";
import { CircleAlert } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";

import { Icon } from "../../../components/ui/icon";
import { Text } from "../../../components/ui/text";
import { cn } from "../../../lib/utils";
import { useThemeColors } from "../../theme/use-theme-colors";

export function CanvasToastStack({
  className,
  messages,
}: {
  className?: string;
  messages?: CanvasStatusMessage[];
}) {
  const colors = useThemeColors();
  if (!messages?.length) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      className={cn(
        "absolute right-3 top-3 z-20 w-[min(384px,calc(100%-24px))] items-end gap-2",
        className,
      )}
    >
      {messages.map((message) => {
        const presentation = canvasToastPresentation(message);
        const hideText = shouldHideToastText(message);
        const key = `${message.tone ?? "default"}:${message.text}`;

        if (presentation === "loading" && hideText) {
          return (
            <View key={key} accessibilityLabel={message.text} className="p-1">
              <ActivityIndicator accessibilityLabel={message.text} color={colors.foreground} size="small" />
            </View>
          );
        }

        const isError = presentation === "error";
        return (
          <View
            key={key}
            accessibilityRole={isError ? "alert" : undefined}
            className={cn(
              "max-w-full flex-row items-start gap-2 rounded-lg border px-3 py-2",
              isError
                ? "border-destructive/35 bg-destructive/10"
                : "border-border/80 bg-popover/95",
            )}
          >
            {isError ? (
              <Icon
                as={CircleAlert}
                className="mt-0.5 size-4 shrink-0 text-destructive-foreground"
                size={16}
                strokeWidth={2}
              />
            ) : null}
            <Text
              className={cn(
                "min-w-0 flex-1 text-sm leading-snug",
                isError ? "text-destructive-foreground" : "text-popover-foreground",
              )}
            >
              {message.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
