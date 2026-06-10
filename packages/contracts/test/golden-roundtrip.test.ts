import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import { decodeJsonEither, formatSchemaError } from "../src/decode.ts";
import {
  AlignerSourceSchema,
  FramePayloadSchema,
  LoadFrameRequestSchema,
  RoiIndexEntrySchema,
  SaveBboxRequestSchema,
  ScanSourceRequestSchema,
  WorkspaceScanSchema,
} from "../src/schema/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
}

function decodeFixture<S extends import("effect/Schema").Schema.Any>(
  schema: S,
  fixtureName: string,
) {
  const result = decodeJsonEither(schema, readFixture(fixtureName));
  if (Either.isLeft(result)) {
    throw new Error(formatSchemaError(result.left));
  }
  return result.right;
}

describe("golden wire roundtrip", () => {
  it("decodes AlignerSource folder variant with internal tag", () => {
    const decoded = decodeFixture(AlignerSourceSchema, "aligner-source-folder.json");
    expect(decoded.kind).toBe("folder");
    expect(decoded.subfolderTemplate).toBe("Pos{p}");
  });

  it("decodes FramePayload with pixelType enum", () => {
    const decoded = decodeFixture(FramePayloadSchema, "frame-payload.json");
    expect(decoded.pixelType).toBe("uint8");
    expect(decoded.width).toBe(4);
    expect(decoded.contrastDomain.min).toBe(0);
  });

  it("decodes ScanSourceRequest wrapper", () => {
    const decoded = decodeFixture(ScanSourceRequestSchema, "scan-source-request.json");
    expect(decoded.source.kind).toBe("folder");
  });

  it("decodes LoadFrameRequest wrapper", () => {
    const decoded = decodeFixture(LoadFrameRequestSchema, "load-frame-request.json");
    expect(decoded.request.pos).toBe(0);
    expect(decoded.contrast?.max).toBe(255);
  });

  it("decodes SaveBboxRequest wrapper", () => {
    const decoded = decodeFixture(SaveBboxRequestSchema, "save-bbox-request.json");
    expect(decoded.workspacePath).toBe("/workspace/Pos0");
    expect(decoded.alignState.excludedCells).toEqual([{ i: 0, j: 1 }]);
  });

  it("decodes WorkspaceScan dimensions", () => {
    const decoded = decodeFixture(WorkspaceScanSchema, "workspace-scan.json");
    expect(decoded.positions).toEqual([0, 1]);
    expect(decoded.zSlices).toEqual([0]);
  });

  it("decodes RoiIndexEntry fixed shape array", () => {
    const decoded = decodeFixture(RoiIndexEntrySchema, "roi-index-entry.json");
    expect(decoded.shape).toEqual([5, 1, 1, 4, 3]);
    expect(decoded.bbox.w).toBe(3);
  });
});
