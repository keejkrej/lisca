import {
  ConnectionStatus,
  Panel,
  ShellThemeToggle,
  StudioNavButton,
  Text,
  useShellServer,
} from "@lisca/ui-native";
import { Link, usePathname } from "expo-router";
import { Pressable, View } from "react-native";

import { useStudioProfile } from "./studio-profile-provider";

const ROUTES = [
  { href: "/assay", label: "Assay type" },
  { href: "/info", label: "Basic info" },
  { href: "/align", label: "Align pattern" },
  { href: "/annotate", label: "Annotate ROI" },
  { href: "/result", label: "View results" },
] as const;

export function StudioNavRail() {
  const pathname = usePathname();
  const server = useShellServer();
  const profile = useStudioProfile();

  return (
    <View className="-m-3 min-h-0 flex-1 gap-2.5 p-2.5">
      <View className="min-h-0 flex-1 justify-center">
        <Panel>
          <View className="items-center gap-6 py-3">
            {ROUTES.map((route) => (
              <Link key={route.href} href={route.href} asChild>
                <StudioNavButton active={pathname === route.href} onPress={() => undefined}>
                  {route.label}
                </StudioNavButton>
              </Link>
            ))}
          </View>
        </Panel>
      </View>
      <View className="gap-2">
        <View className="items-center">
          <ConnectionStatus
            state={server.state}
            wsUrl={server.wsUrl}
            onOpenSettings={server.openSettings}
          />
        </View>
        <View className="flex-row items-center justify-center gap-1">
          <Pressable onPress={profile.switchProfile}>
            <Text className="max-w-24 text-xs opacity-70">
              {profile.session.mode === "guest" ? "Guest" : profile.session.displayName}
            </Text>
          </Pressable>
          <ShellThemeToggle />
        </View>
      </View>
    </View>
  );
}
