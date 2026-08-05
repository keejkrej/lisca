import type { AlignerSource, FrameRequest, WorkspaceScan } from "@lisca/contracts";
import type { StudioAssaySampleRow } from "@lisca/contracts/assay";
import { DEFAULT_FOLDER_SOURCE_TEMPLATE } from "@lisca/contracts/assay";

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

export function studioBrightfieldChannel(samples: StudioAssaySampleRow[]): number {
  for (const row of samples) {
    const channel = parseChannel(row.brightfield);
    if (channel != null) return channel;
  }
  return 0;
}

/** @deprecated Use studioBrightfieldChannel */
export const studioMaskChannel = (
  samplesOrInfo3: StudioAssaySampleRow[] | { samples: StudioAssaySampleRow[] },
): number => {
  const samples = Array.isArray(samplesOrInfo3) ? samplesOrInfo3 : samplesOrInfo3.samples;
  return studioBrightfieldChannel(samples);
};

function lastOrZero(values: number[] | undefined): number {
  return values?.[Math.max(0, values.length - 1)] ?? 0;
}

function firstOrZero(values: number[] | undefined): number {
  return values?.[0] ?? 0;
}

export function lockedStudioSelection(
  scan: WorkspaceScan,
  current: FrameRequest,
  brightfieldChannel: number,
  positionOptions: number[] = scan.positions,
): FrameRequest {
  const position = positionOptions.includes(current.pos)
    ? current.pos
    : firstOrZero(positionOptions);
  return {
    pos: position,
    channel: brightfieldChannel,
    time: lastOrZero(scan.times),
    z: 0,
  };
}
