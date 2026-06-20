import { LiscaMobileProviders, StorageBootstrap } from "@lisca/mobile-app";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AlignerAtomsProvider } from "../src/components/aligner-atoms-provider";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StorageBootstrap>
          <LiscaMobileProviders
            appId="aligner"
            defaultPort={8765}
            AtomsProvider={AlignerAtomsProvider}
          >
            <Stack screenOptions={{ headerShown: false }} />
          </LiscaMobileProviders>
        </StorageBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
