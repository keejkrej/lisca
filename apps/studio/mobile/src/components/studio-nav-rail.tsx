import {
  ConnectionStatus,
  Panel,
  ShellThemeToggle,
  StudioNavButton,
  useShellServer,
} from "@lisca/ui-native";
import { Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
    <View style={styles.root}>
      <View style={styles.navCenter}>
        <Panel>
          <View style={styles.navStack}>
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
      <View style={styles.footer}>
        <View style={styles.footerSpacer} />
        <ConnectionStatus
          state={server.state}
          wsUrl={server.wsUrl}
          onOpenSettings={server.openSettings}
        />
        <Pressable onPress={profile.switchProfile}>
          <Text style={styles.profileLabel}>
            {profile.session.mode === "guest" ? "Guest" : profile.session.displayName}
          </Text>
        </Pressable>
        <ShellThemeToggle />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 10,
    margin: -12,
    minHeight: 0,
    padding: 10,
  },
  navCenter: {
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
  },
  navStack: {
    alignItems: "center",
    gap: 24,
    paddingVertical: 12,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  footerSpacer: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 12,
    maxWidth: 96,
    opacity: 0.7,
  },
});
