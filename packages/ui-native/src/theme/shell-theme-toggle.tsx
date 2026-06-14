import { Button } from "../../components/ui/button";
import { Icon } from "../../components/ui/icon";
import { cn } from "../../lib/utils";
import { Moon, Sun } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { useShellTheme } from "./shell-theme";

export function ShellThemeToggle(props: { className?: string }) {
  const { mode, toggleLightDark } = useShellTheme();
  const { setColorScheme } = useColorScheme();
  const title = mode === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <Button
      accessibilityLabel={title}
      className={cn("size-8", props.className)}
      size="icon"
      variant="ghost"
      onPress={() => {
        setColorScheme(mode === "light" ? "dark" : "light");
        toggleLightDark();
      }}
    >
      <Icon as={mode === "light" ? Moon : Sun} className="text-foreground" size={16} strokeWidth={2} />
    </Button>
  );
}
