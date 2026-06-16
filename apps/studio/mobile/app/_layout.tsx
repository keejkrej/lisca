import { LiscaMobileProviders, StorageBootstrap } from "@lisca/mobile-app";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StudioAtomsProvider } from "../src/components/studio-atoms-provider";
import { StudioBasicInfoLeaveProvider } from "../src/components/studio-basic-info-leave-guard";
import { StudioWorkSessionGate } from "../src/components/studio-work-session-gate";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StorageBootstrap>
          <LiscaMobileProviders appId="studio" defaultPort={8767} AtomsProvider={StudioAtomsProvider}>
            <StudioWorkSessionGate>
              <StudioBasicInfoLeaveProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </StudioBasicInfoLeaveProvider>
            </StudioWorkSessionGate>
          </LiscaMobileProviders>
        </StorageBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
