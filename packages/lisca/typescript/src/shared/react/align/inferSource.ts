import type { ViewerSource } from "lisca/shared/contracts";

/** Infer TIFF folder vs ND2/CZI/JPG roots from Basic info-style path strings. */
export function inferSourceFromDataPath(path: string): ViewerSource | null {
  const normalized = path.trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower.endsWith(".nd2")) return { kind: "nd2", path: normalized };
  if (lower.endsWith(".czi")) return { kind: "czi", path: normalized };
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return { kind: "jpg", path: normalized };

  return { kind: "tif", path: normalized };
}
