import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-solid";
import type { Component, ComponentProps, JSX } from "solid-js";
import { Toaster as Sonner } from "solid-sonner";

import { useShellTheme } from "../../shell/theme/shell-theme";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster: Component<ToasterProps> = (props) => {
  const theme = useShellTheme();
  return (
    <Sonner
      theme={theme.resolvedTheme}
      class="toaster group"
      position="top-center"
      icons={{
        success: <CircleCheck class="size-4" />,
        info: <Info class="size-4" />,
        warning: <TriangleAlert class="size-4" />,
        error: <OctagonX class="size-4" />,
        loading: <LoaderCircle class="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as JSX.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
