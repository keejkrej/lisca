import { LiscaMobileProviders, StorageBootstrap } from "@lisca/mobile-app";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StudioAtomsProvider } from "../src/components/studio-atoms-provider";
import { StudioProfileProvider } from "../src/components/studio-profile-provider";
import { StudioBasicInfoLeaveProvider } from "../src/components/studio-basic-info-leave-guard";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StorageBootstrap>
          <LiscaMobileProviders defaultPort={8767} AtomsProvider={StudioAtomsProvider}>
            <StudioProfileProvider>
              <StudioBasicInfoLeaveProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </StudioBasicInfoLeaveProvider>
            </StudioProfileProvider>
          </LiscaMobileProviders>
        </StorageBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
