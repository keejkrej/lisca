import {
  ConnectionStatus,
  Panel,
  ShellThemeToggle,
  StudioNavButton,
  Text,
  useShellServer,
} from "@lisca/ui-native";
import { usePathname, useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { confirmStudioAnnotateLeave } from "../state/studio-annotate-guard";
import { isBasicInfoDirty, useStudioStore } from "../state/studio-store";
import { useStudioProfile } from "./studio-profile-provider";
import { useStudioBasicInfoLeave } from "./studio-basic-info-leave-guard";

const ROUTES = [
  { href: "/assay", label: "Assay type" },
  { href: "/info", label: "Basic info" },
  { href: "/align", label: "Align pattern" },
  { href: "/annotate", label: "Annotate ROI" },
  { href: "/result", label: "View results" },
] as const;

export function StudioNavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const server = useShellServer();
  const profile = useStudioProfile();
  const wizard = useStudioStore((state) => state);
  const basicInfoDirty = isBasicInfoDirty(wizard);
  const { requestLeave } = useStudioBasicInfoLeave();

  const navigate = async (href: (typeof ROUTES)[number]["href"]) => {
    if (pathname === "/annotate" && href !== "/annotate") {
      const ok = await confirmStudioAnnotateLeave();
      if (!ok) return;
    }
    if (pathname === "/info" && href !== "/info" && basicInfoDirty) {
      requestLeave(() => router.push(href));
      return;
    }
    router.push(href);
  };

  return (
    <View className="-m-3 min-h-0 flex-1 gap-2.5 p-2.5">
      <View className="min-h-0 flex-1 justify-center">
        <Panel>
          <View className="items-center gap-6 py-3">
            {ROUTES.map((route) => (
              <Pressable key={route.href} onPress={() => void navigate(route.href)}>
                <StudioNavButton active={pathname === route.href} onPress={() => undefined}>
                  {route.label}
                </StudioNavButton>
              </Pressable>
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
