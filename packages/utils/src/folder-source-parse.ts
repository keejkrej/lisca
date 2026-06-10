import { FOLDER_SOURCE_TEMPLATE_PRESETS } from "@lisca/contracts/assay";

export type ListDirectoryHostPort = {
  listDirectory: (path: string | null) => Promise<{
    entries: { name: string; path: string; isDirectory: boolean }[];
  }>;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function templateRegex(template: string): RegExp {
  const source = template
    .split(/(\{(?:p|position|t|time|c|channel|z)\})/g)
    .map((part) => (part.startsWith("{") && part.endsWith("}") ? "(.+?)" : escapeRegex(part)))
    .join("");
  return new RegExp(`^${source}$`, "i");
}

export function filenameStem(name: string): string {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(0, index) : name;
}

export function isSupportedImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    !lower.endsWith("_seg.npy") &&
    (lower.endsWith(".tif") ||
      lower.endsWith(".tiff") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg"))
  );
}

export async function directoryMatchesFilenameTemplate(
  directory: { path: string },
  filenameRegex: RegExp,
  hostPort: ListDirectoryHostPort,
): Promise<boolean> {
  const listing = await hostPort.listDirectory(directory.path);
  return listing.entries
    .filter((entry) => !entry.isDirectory && isSupportedImageName(entry.name))
    .some((entry) => filenameRegex.test(filenameStem(entry.name)));
}

export async function findMatchingDirectory(
  directories: { path: string }[],
  filenameRegex: RegExp,
  hostPort: ListDirectoryHostPort,
): Promise<boolean> {
  if (directories.length === 0) return false;
  const [directory, ...rest] = directories;
  if (await directoryMatchesFilenameTemplate(directory, filenameRegex, hostPort)) {
    return true;
  }
  return findMatchingDirectory(rest, filenameRegex, hostPort);
}

export async function detectPresetAtIndex(
  directories: { name: string; path: string; isDirectory: boolean }[],
  presetIndex: number,
  hostPort: ListDirectoryHostPort,
): Promise<(typeof FOLDER_SOURCE_TEMPLATE_PRESETS)[number] | null> {
  if (presetIndex >= FOLDER_SOURCE_TEMPLATE_PRESETS.length) return null;

  const preset = FOLDER_SOURCE_TEMPLATE_PRESETS[presetIndex];
  const subfolderRegex = templateRegex(preset.subfolderTemplate);
  const filenameRegex = templateRegex(preset.filenameTemplate);
  const matchingDirectories = directories.filter((entry) => subfolderRegex.test(entry.name));
  const matched = await findMatchingDirectory(
    matchingDirectories.slice(0, 12),
    filenameRegex,
    hostPort,
  );
  if (matched) return preset;

  return detectPresetAtIndex(directories, presetIndex + 1, hostPort);
}

export async function detectFolderSourceTemplate(
  path: string,
  hostPort: ListDirectoryHostPort,
): Promise<(typeof FOLDER_SOURCE_TEMPLATE_PRESETS)[number] | null> {
  const root = await hostPort.listDirectory(path);
  const directories = root.entries.filter((entry) => entry.isDirectory);
  return detectPresetAtIndex(directories, 0, hostPort);
}
