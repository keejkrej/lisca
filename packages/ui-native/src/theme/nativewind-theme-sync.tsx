import { useColorScheme } from "nativewind";
import { useLayoutEffect, type ReactNode } from "react";

import { useShellTheme } from "./shell-theme";

/** Keeps NativeWind's color scheme in sync with {@link ShellThemeProvider}. */
export function NativeWindThemeSync({ children }: { children: ReactNode }) {
  const { mode } = useShellTheme();
  const { setColorScheme } = useColorScheme();

  // useLayoutEffect (not useEffect) so Tailwind `dark:` / semantic tokens update before paint.
  useLayoutEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  return children;
}
