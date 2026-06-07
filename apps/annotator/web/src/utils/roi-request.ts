import type { RoiFrameRequest, RoiIndexEntry, RoiPositionScan } from "@lisca/contracts";

export function makeRequest(
  position: RoiPositionScan | null,
  roi: RoiIndexEntry | null,
  channel: number | null,
  timeIndex: number,
  zIndex: number,
): RoiFrameRequest | null {
  if (!position || !roi || channel == null) return null;
  const time = position.times[timeIndex];
  const z = position.zSlices[zIndex];
  if (time == null || z == null) return null;
  return {
    pos: position.pos,
    roi: roi.roi,
    channel,
    time,
    z,
  };
}
