import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

/** Where the Vite app is served (use your LAN IP for a physical iPad, e.g. http://192.168.1.10:5173). */
const WEB_URL = process.env.EXPO_PUBLIC_LISCA_WEB_URL ?? "http://127.0.0.1:5173";
/** Remote WebSocket URL (e.g. wss://api.example.com/ws). Passed into the web bundle as ?liscaWs=… */
const REMOTE_WS_URL = process.env.EXPO_PUBLIC_LISCA_WS_URL;

function embeddedWebUri(): string {
  const ws = REMOTE_WS_URL?.trim();
  if (!ws) return WEB_URL;
  const sep = WEB_URL.includes("?") ? "&" : "?";
  return `${WEB_URL}${sep}liscaWs=${encodeURIComponent(ws)}`;
}

export default function App() {
  const uri = embeddedWebUri();
  const showDevHint = __DEV__ && !REMOTE_WS_URL?.trim();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        source={{ uri }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
      {showDevHint ? (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>
            Set EXPO_PUBLIC_LISCA_WS_URL to your remote ws/wss URL. Web UI:
            EXPO_PUBLIC_LISCA_WEB_URL (default {WEB_URL}).
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
  hint: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  hintText: {
    color: "#fff",
    fontSize: 11,
  },
});
