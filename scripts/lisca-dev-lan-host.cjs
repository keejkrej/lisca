const os = require("node:os");

/** Prefer interfaces common on macOS dev setups (Wi‑Fi, iPhone hotspot). */
const PREFERRED_INTERFACE_NAMES = ["bridge100", "en0", "en1", "wlan0", "eth0"];

/**
 * Resolve a non-loopback IPv4 for physical-device dev (iPad, phone).
 * Override with `LISCA_DEV_HOST` or `EXPO_PUBLIC_LISCA_WS_HOST`.
 */
function resolveDevLanHost(env = process.env) {
  const fromEnv = env.LISCA_DEV_HOST?.trim() || env.EXPO_PUBLIC_LISCA_WS_HOST?.trim();
  if (fromEnv) return fromEnv;

  const candidates = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      candidates.push({ name, address: entry.address });
    }
  }

  for (const preferred of PREFERRED_INTERFACE_NAMES) {
    const match = candidates.find((entry) => entry.name === preferred);
    if (match) return match.address;
  }

  return candidates[0]?.address ?? "127.0.0.1";
}

module.exports = {
  PREFERRED_INTERFACE_NAMES,
  resolveDevLanHost,
};
