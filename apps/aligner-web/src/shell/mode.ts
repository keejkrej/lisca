export type AlignerMode = "raw" | "roi";

export const MODE_STORAGE_KEY = "lisca.aligner.mode";

export function parseMode(value: unknown): AlignerMode | null {
  return value === "raw" || value === "roi" ? value : null;
}

export function readStoredMode(
  storage: Pick<Storage, "getItem"> | null | undefined,
): AlignerMode | null {
  if (!storage) return null;
  return parseMode(storage.getItem(MODE_STORAGE_KEY));
}

export function modeToPath(mode: AlignerMode): "/raw" | "/roi" {
  return mode === "roi" ? "/roi" : "/raw";
}

export function pathToMode(path: string): AlignerMode | null {
  if (path === "/raw") return "raw";
  if (path === "/roi") return "roi";
  return null;
}

export function indexRedirectPath(
  storage: Pick<Storage, "getItem"> | null | undefined,
): "/raw" | "/roi" {
  return modeToPath(readStoredMode(storage) ?? "raw");
}
