import type { ReactNode } from "react";
import { View } from "react-native";

/** Padded main-column frame for canvas, plots, and other primary viewport content. */
export function ViewportCard({ children }: { children: ReactNode }) {
  return (
    <View className="min-h-0 flex-1 bg-background p-3">
      <View className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-background">
        {children}
      </View>
    </View>
  );
}
