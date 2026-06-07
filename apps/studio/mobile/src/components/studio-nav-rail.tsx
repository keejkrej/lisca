import { Button, ConnectionStatus, useShellServer } from "@lisca/ui-native";
import { Link, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";

const ROUTES = [
  { href: "/assay", label: "Assay" },
  { href: "/info", label: "Info" },
  { href: "/align", label: "Align" },
  { href: "/annotate", label: "Annotate" },
  { href: "/result", label: "Result" },
] as const;

export function StudioNavRail() {
  const pathname = usePathname();
  const server = useShellServer();

  return (
    <View style={styles.root}>
      {ROUTES.map((route) => (
        <Link key={route.href} href={route.href} asChild>
          <Button
            label={route.label}
            compact
            variant={pathname === route.href ? "default" : "outline"}
            onPress={() => undefined}
          />
        </Link>
      ))}
      <View style={styles.spacer} />
      <Button label="Server" variant="ghost" compact onPress={server.openSettings} />
      <ConnectionStatus state={server.state} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 8,
    gap: 8,
    alignItems: "stretch",
  },
  spacer: { flex: 1 },
});
