import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import { decodeJsonEither, formatSchemaError } from "../src/decode";
import {
  AlignerSourceSchema,
  FramePayloadSchema,
  LoadFrameRequestSchema,
  OperationDetailSchema,
  RoiIndexEntrySchema,
  SaveBboxRequestSchema,
  ScanSourceRequestSchema,
  U64,
  WorkspaceScanSchema,
} from "../src/schema/index";

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
    if (decoded.kind !== "folder") throw new Error("expected folder source fixture");
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

  it("decodes operation, task, and attempt observability identities", () => {
    const decoded = decodeJsonEither(OperationDetailSchema, {
      operation: {
        operationId: "op-1",
        kind: "test-operation",
        workspaceId: "ws-1",
        workspacePath: "/workspace",
        mutating: true,
        status: "running",
        attention: "none",
        progress: {
          total: 1,
          queued: 0,
          blocked: 0,
          running: 1,
          completed: 0,
          failed: 0,
          cancelled: 0,
          cancellationRequested: 0,
        },
        createdAtMs: 1,
        updatedAtMs: 2,
      },
      tasks: [
        {
          taskId: "task-1",
          operationId: "op-1",
          taskKind: "test-task",
          workspaceId: "ws-1",
          status: "running",
          weight: 1,
          enqueueOrder: 0,
          dependencies: [],
          blockedBy: [],
          attempts: [
            {
              attemptId: "attempt-1",
              operationId: "op-1",
              taskId: "task-1",
              status: "running",
              startedAtMs: 2,
              finishedAtMs: null,
              error: null,
            },
          ],
        },
      ],
    });
    if (Either.isLeft(decoded)) throw new Error(formatSchemaError(decoded.left));
    expect(decoded.right.tasks[0]?.attempts[0]?.attemptId).toBe("attempt-1");
  });

  it("decodes partial operation progress and dependency failure context", () => {
    const decoded = decodeJsonEither(OperationDetailSchema, {
      operation: {
        operationId: "op-partial",
        kind: "analysis",
        workspaceId: "ws-1",
        workspacePath: "/workspace",
        mutating: true,
        status: "partially-complete",
        attention: "error",
        progress: {
          total: 3,
          queued: 0,
          blocked: 1,
          running: 0,
          completed: 1,
          failed: 1,
          cancelled: 0,
          cancellationRequested: 0,
        },
        createdAtMs: 1,
        updatedAtMs: 3,
      },
      tasks: [
        {
          taskId: "aggregate",
          operationId: "op-partial",
          taskKind: "aggregate",
          workspaceId: "ws-1",
          status: "blocked",
          weight: 1,
          enqueueOrder: 2,
          dependencies: ["failed-position"],
          blockedBy: [
            {
              taskId: "failed-position",
              taskKind: "position",
              status: "failed",
              error: { code: "bad_input", message: "position input is invalid" },
            },
          ],
          attempts: [],
        },
      ],
    });
    if (Either.isLeft(decoded)) throw new Error(formatSchemaError(decoded.left));
    expect(decoded.right.operation.progress.blocked).toBe(1);
    expect(decoded.right.tasks[0]?.blockedBy[0]?.error?.code).toBe("bad_input");
  });

  it("rejects u64 wire numbers that JavaScript cannot represent exactly", () => {
    expect(Either.isRight(decodeJsonEither(U64, Number.MAX_SAFE_INTEGER))).toBe(true);
    expect(Either.isLeft(decodeJsonEither(U64, Number.MAX_SAFE_INTEGER + 1))).toBe(true);
  });
});
