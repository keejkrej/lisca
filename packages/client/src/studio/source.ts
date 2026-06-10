import type { AlignerSource, FrameRequest, WorkspaceScan } from "@lisca/contracts";
import type { StudioBasicInfoStep1, StudioBasicInfoStep3 } from "@lisca/contracts/assay";

export function toStudioSource(
  kind: AlignerSource["kind"] | null,
  info1: StudioBasicInfoStep1,
): AlignerSource | null {
  const trimmed = info1.dataPath.trim();
  if (!trimmed || !kind) return null;
  if (kind === "folder") {
    return {
      kind,
      path: trimmed,
      subfolderTemplate: info1.folderSubfolderTemplate.trim(),
      filenameTemplate: info1.folderFilenameTemplate.trim(),
    };
  }
  return { kind, path: trimmed } as AlignerSource;
}

function parseChannel(value: string): number | null {
  const channel = Number(value.trim());
  return Number.isInteger(channel) && channel >= 0 ? channel : null;
}

export function studioMaskChannel(info3: StudioBasicInfoStep3): number {
  const rows = info3.samplesBySlide[info3.selectedSlideId];
  for (const row of rows) {
    const channel = parseChannel(row.maskChannel);
    if (channel != null) return channel;
  }
  return 0;
}

function lastOrZero(values: number[] | undefined): number {
  return values?.[Math.max(0, values.length - 1)] ?? 0;
}

function firstOrZero(values: number[] | undefined): number {
  return values?.[0] ?? 0;
}

export function lockedStudioSelection(
  scan: WorkspaceScan,
  current: FrameRequest,
  maskChannel: number,
  positionOptions: number[] = scan.positions,
): FrameRequest {
  const position = positionOptions.includes(current.pos)
    ? current.pos
    : firstOrZero(positionOptions);
  return {
    pos: position,
    channel: maskChannel,
    time: lastOrZero(scan.times),
    z: 0,
  };
}
