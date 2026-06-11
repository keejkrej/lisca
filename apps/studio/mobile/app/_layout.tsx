import { LiscaMobileProviders, StorageBootstrap } from "@lisca/mobile-app";
import { Stack } from "expo-router";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StudioAtomsProvider } from "../src/components/studio-atoms-provider";
import { StudioProfileProvider } from "../src/components/studio-profile-provider";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StorageBootstrap>
          <LiscaMobileProviders defaultPort={8767} AtomsProvider={StudioAtomsProvider}>
            <StudioProfileProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </StudioProfileProvider>
          </LiscaMobileProviders>
        </StorageBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
