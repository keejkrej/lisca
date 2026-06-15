const os = require("node:os");

/** Prefer Wi‑Fi / Ethernet on macOS and Linux dev setups. */
const PREFERRED_INTERFACE_NAMES = ["en0", "en1", "en2", "wlan0", "eth0"];

/** Host-only / link-local ranges that iPads cannot reach in normal dev. */
const SKIP_ADDRESS_PREFIXES = ["169.254.", "192.168.64."];

function isUsableDevHost(address) {
  return !SKIP_ADDRESS_PREFIXES.some((prefix) => address.startsWith(prefix));
}

function isIphoneHotspotBridge(entry) {
  return entry.name.startsWith("bridge") && entry.address.startsWith("172.20.10.");
}

/**
 * Resolve a non-loopback IPv4 for physical-device dev (iPad, phone).
 * Override with `LISCA_DEV_HOST` or `EXPO_PUBLIC_LISCA_HTTP_HOST`.
 */
function resolveDevLanHost(env = process.env) {
  const fromEnv = env.LISCA_DEV_HOST?.trim() || env.EXPO_PUBLIC_LISCA_HTTP_HOST?.trim();
  if (fromEnv) return fromEnv;

  const candidates = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      candidates.push({ name, address: entry.address });
    }
  }

  const usable = candidates.filter((entry) => isUsableDevHost(entry.address));

  for (const preferred of PREFERRED_INTERFACE_NAMES) {
    const match = usable.find((entry) => entry.name === preferred);
    if (match) return match.address;
  }

  const hotspot = usable.find(isIphoneHotspotBridge);
  if (hotspot) return hotspot.address;

  return usable[0]?.address ?? candidates[0]?.address ?? "127.0.0.1";
}

module.exports = {
  PREFERRED_INTERFACE_NAMES,
  SKIP_ADDRESS_PREFIXES,
  isUsableDevHost,
  isIphoneHotspotBridge,
  resolveDevLanHost,
};
