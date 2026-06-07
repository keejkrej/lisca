import { LiscaMobileProviders } from "@lisca/mobile-app";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

import { AlignerAtomsProvider } from "../src/components/aligner-atoms-provider";
import { StorageBootstrap } from "../src/storage-bootstrap";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StorageBootstrap>
          <LiscaMobileProviders defaultPort={8765} AtomsProvider={AlignerAtomsProvider}>
            <Stack screenOptions={{ headerShown: false }} />
          </LiscaMobileProviders>
        </StorageBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
