import type { ViewerSelection, WorkspaceScan } from "lisca/shared/contracts";

/** Smallest position, channel 0 when present, first z/time. */
export function initialAlignSelection(scan: WorkspaceScan): ViewerSelection {
  return {
    pos: scan.positions[0] ?? 0,
    channel: scan.channels.includes(0) ? 0 : (scan.channels[0] ?? 0),
    z: scan.zSlices[0] ?? 0,
    time: scan.times[0] ?? 0,
  };
}

/** After commit: advance time within position, then wrap time and increment position. */
export function advanceAlignSelection(
  scan: WorkspaceScan,
  selection: ViewerSelection,
): ViewerSelection | null {
  const times = scan.times;
  const positions = scan.positions;
  if (times.length === 0 || positions.length === 0) return null;

  const timeIdx = times.indexOf(selection.time);
  const posIdx = positions.indexOf(selection.pos);
  const safeTimeIdx = timeIdx >= 0 ? timeIdx : 0;
  const safePosIdx = posIdx >= 0 ? posIdx : 0;

  if (safeTimeIdx < times.length - 1) {
    return { ...selection, time: times[safeTimeIdx + 1]! };
  }
  if (safePosIdx < positions.length - 1) {
    return {
      ...selection,
      pos: positions[safePosIdx + 1]!,
      time: times[0]!,
    };
  }

  return null;
}
