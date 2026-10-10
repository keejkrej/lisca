import type { AlignerSource, FrameRequest, WorkspaceScan } from "@lisca/contracts";
import type { StudioAssaySampleRow } from "@lisca/contracts/assay";
import { ASSAY_TYPE, DEFAULT_FOLDER_SOURCE_TEMPLATE } from "@lisca/contracts/assay";

export function toStudioSource(input: {
  kind: AlignerSource["kind"] | null;
  dataPath: string;
  folderTemplate?: { subfolder: string; filename: string };
}): AlignerSource | null {
  const trimmed = input.dataPath.trim();
  if (!trimmed || !input.kind) return null;
  if (input.kind === "folder") {
    return {
      kind: "folder",
      path: trimmed,
      subfolderTemplate:
        input.folderTemplate?.subfolder.trim() || DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
      filenameTemplate:
        input.folderTemplate?.filename.trim() || DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
    };
  }
  return { kind: input.kind, path: trimmed } as AlignerSource;
}

function parseChannel(value: string): number | null {
  const channel = Number(value.trim());
  return Number.isInteger(channel) && channel >= 0 ? channel : null;
}

export function studioSegmentationChannel(
  samples: StudioAssaySampleRow[],
  sharedSegmentation = "",
): number {
  const shared = parseChannel(sharedSegmentation);
  if (shared != null) return shared;
  for (const row of samples) {
    const channel = parseChannel(row.segmentation);
    if (channel != null) return channel;
  }
  return 0;
}

function lastOrZero(values: readonly number[] | undefined): number {
  return values?.[Math.max(0, values.length - 1)] ?? 0;
}

function firstOrZero(values: readonly number[] | undefined): number {
  return values?.[0] ?? 0;
}

export type StudioAlignFrameDefault = "first" | "last";

/** Killing assays start on the first frame. Every other assay starts on the last. */
export function studioAlignFrameDefault(
  assayId: string | null | undefined,
): StudioAlignFrameDefault {
  return assayId === ASSAY_TYPE.KILLING_DEATH_REPORTER || assayId === ASSAY_TYPE.KILLING_ENGAGEMENT
    ? "first"
    : "last";
}

export function defaultStudioAlignTime(
  times: readonly number[] | undefined,
  frameDefault: StudioAlignFrameDefault,
): number {
  return frameDefault === "first" ? firstOrZero(times) : lastOrZero(times);
}

export type StudioAlignTimeOptions = {
  frameDefault?: StudioAlignFrameDefault;
  /** Frame the user already chose for this position. Absent means the position is new. */
  rememberedTime?: number;
  /** Channel the user already chose for this position. Absent means the position is new. */
  rememberedChannel?: number;
};

/** A new position starts on channel 0. If the scan has no channel 0, use its first channel. */
export function defaultStudioAlignChannel(channels: readonly number[] | undefined): number {
  if (channels == null || channels.length === 0 || channels.includes(0)) return 0;
  return firstOrZero(channels);
}

function lockedChannel(
  channels: readonly number[] | undefined,
  rememberedChannel: number | undefined,
): number {
  if (
    rememberedChannel != null &&
    (channels == null || channels.length === 0 || channels.includes(rememberedChannel))
  ) {
    return rememberedChannel;
  }
  return defaultStudioAlignChannel(channels);
}

/**
 * Z stays on plane 0. Channel and time are remembered per position.
 * A position with no memory starts on channel 0 and the assay's default frame.
 * Those defaults apply together, and only until the user chooses a value there.
 */
export function lockedStudioSelection(
  scan: WorkspaceScan,
  current: FrameRequest,
  positionOptions: number[] = scan.positions,
  timeOptions?: StudioAlignTimeOptions,
): FrameRequest {
  const position = positionOptions.includes(current.pos)
    ? current.pos
    : firstOrZero(positionOptions);
  const times = scan.times ?? [];
  const remembered = timeOptions?.rememberedTime;
  const time =
    remembered != null && (times.length === 0 || times.includes(remembered))
      ? remembered
      : defaultStudioAlignTime(times, timeOptions?.frameDefault ?? "last");
  return {
    pos: position,
    channel: lockedChannel(scan.channels, timeOptions?.rememberedChannel),
    time,
    z: 0,
  };
}

const alignFrameMemory = new Map<string, Map<number, number>>();
const alignChannelMemory = new Map<string, Map<number, number>>();

export function studioAlignFrameMemoryKey(input: {
  workspacePath: string | null;
  source: AlignerSource | null;
  assayId: string | null;
}): string {
  return JSON.stringify([input.workspacePath ?? "", input.source, input.assayId ?? ""]);
}

export function recallStudioAlignFrame(key: string, position: number): number | undefined {
  return alignFrameMemory.get(key)?.get(position);
}

export function rememberStudioAlignFrame(key: string, position: number, time: number): void {
  let frames = alignFrameMemory.get(key);
  if (!frames) {
    frames = new Map();
    alignFrameMemory.set(key, frames);
  }
  frames.set(position, time);
}

export function recallStudioAlignChannel(key: string, position: number): number | undefined {
  return alignChannelMemory.get(key)?.get(position);
}

export function rememberStudioAlignChannel(key: string, position: number, channel: number): void {
  let channels = alignChannelMemory.get(key);
  if (!channels) {
    channels = new Map();
    alignChannelMemory.set(key, channels);
  }
  channels.set(position, channel);
}

export function clearStudioAlignFrameMemory(): void {
  alignFrameMemory.clear();
  alignChannelMemory.clear();
}

/** Back is off on the first assay position. Next is off on the last. A position outside the list disables both. */
export function studioAlignPositionNav(
  positions: readonly number[],
  currentPosition: number,
): { canGoBack: boolean; canGoNext: boolean } {
  const index = positions.indexOf(currentPosition);
  return {
    canGoBack: index > 0,
    canGoNext: index >= 0 && index < positions.length - 1,
  };
}
