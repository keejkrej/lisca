import { useColorScheme } from "nativewind";
import { useEffect, type ReactNode } from "react";

import { useShellTheme } from "./shell-theme";

/** Keeps NativeWind's color scheme in sync with {@link ShellThemeProvider}. */
export function NativeWindThemeSync({ children }: { children: ReactNode }) {
  const { mode } = useShellTheme();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  return children;
}
