import { ASSAY_TYPE, type StudioAssaySampleRow } from "@lisca/contracts/assay";
import { describe, expect, test } from "vite-plus/test";

import { buildStudioAssayJson, parseStudioAssayJson } from "../src/atoms/studio-ui";

type BuildInput = Parameters<typeof buildStudioAssayJson>[0];

function row(id: string, name: string, segmentation: string, signal: string): StudioAssaySampleRow {
  return { id, name, positions: "0:1", segmentation, signal };
}

function build(samples: StudioAssaySampleRow[], analysis?: BuildInput["analysis"]) {
  return buildStudioAssayJson({
    assayId: ASSAY_TYPE.KILLING_DEATH_REPORTER,
    name: "Run",
    dataSourceKind: "nd2",
    dataPath: "/data/run.nd2",
    folderTemplate: { subfolder: "", filename: "" },
    workspacePath: "/ws",
    intervalValue: 10,
    intervalUnit: "minute",
    samples,
    analysis,
  });
}

describe("studio assay.json samples", () => {
  test("writes samples by name and per-sample overrides keyed by sample name", () => {
    const json = build([row("a", " Control ", "0", "1"), row("b", "CAR-T", "2", "1,3")]);
    expect(json.samples).toEqual([
      { name: "Control", positions: "0:1" },
      { name: "CAR-T", positions: "0:1" },
    ]);
    expect(json.analysis).toEqual({
      skipSegment: false,
      segmentationMode: "logstd",
      channels: { segmentation: 0, signal: [1] },
      sampleChannels: [{ sample: "CAR-T", segmentation: 2, signal: [1, 3] }],
    });
  });

  test("drops a stale override when its sample is renamed", () => {
    const json = build([row("a", "Control", "0", "1"), row("b", "Renamed", "0", "1")], {
      channels: { segmentation: 0, signal: [1] },
      sampleChannels: [{ sample: "Old name", segmentation: 2, signal: [3] }],
    });
    expect(json.analysis).toEqual({
      skipSegment: false,
      segmentationMode: "logstd",
      channels: { segmentation: 0, signal: [1] },
    });
  });

  test("round-trips sampleChannels by sample name when loading assay.json", () => {
    const json = build([row("a", "Control", "0", "1"), row("b", "CAR-T", "2", "1,3")]);
    expect(parseStudioAssayJson(JSON.stringify(json))).toEqual(json);
  });
});
