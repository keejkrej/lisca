import { describe, expect, test } from "vite-plus/test";

import {
  catalogFromScan,
  commitDisplayPositionDraft,
  fileIdsForIndices,
  formatPositionChip,
  formatResolvedPreview,
  migrateStoredPositions,
  parseLabelPositionList,
  POSITION_INDEX_VERSION,
  resolveLegacyNumber,
  resolveStoredFileIds,
  sequentialCatalog,
  sparseFolderCatalog,
} from "../src/studio/position-index";

describe("position index encoding", () => {
  test("folder Pos001–Pos067: a pre-0.5.1 1-based UI range keeps Pos001–Pos066, not Pos067", () => {
    const catalog = sequentialCatalog("folder", 67);
    expect(catalog.ids[0]).toBe(1);
    expect(catalog.ids[66]).toBe(67);
    expect(catalog.labels[0]).toBe("1");
    expect(catalog.labels[66]).toBe("67");

    // Old Metadata stored display-1, so typing 1–67 wrote 0:66.
    const migrated = migrateStoredPositions("0:66", undefined, catalog);
    expect(migrated).toEqual({
      ok: true,
      positions: "0:65",
      version: POSITION_INDEX_VERSION,
    });
    if (!migrated.ok) return;
    const ids = fileIdsForIndices(
      Array.from({ length: 66 }, (_, index) => index),
      catalog,
    );
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(66);
    expect(ids).not.toContain(67);

    const resolved = resolveStoredFileIds("0:66", undefined, catalog);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.ids).toEqual(ids);
  });

  test("folder Pos001–Pos067: labels 1–67 now store indices 0:66 and keep every folder", () => {
    const catalog = sequentialCatalog("folder", 67);
    expect(parseLabelPositionList("1-67", catalog).ranges).toEqual([{ start: 0, end: 66 }]);
    const migrated = migrateStoredPositions("0:66", POSITION_INDEX_VERSION, catalog);
    expect(migrated).toEqual({
      ok: true,
      positions: "0:66",
      version: POSITION_INDEX_VERSION,
    });
    const resolved = resolveStoredFileIds("0:66", POSITION_INDEX_VERSION, catalog);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.ids[0]).toBe(1);
    expect(resolved.ids[resolved.ids.length - 1]).toBe(67);
    expect(resolved.ids).toHaveLength(67);
  });

  test("sparse folder: legacy 138 still means Pos138, not the 139th folder", () => {
    const catalog = sparseFolderCatalog([138, 144, 161]);
    expect(resolveLegacyNumber(138, catalog)).toBe(0);
    expect(resolveLegacyNumber(144, catalog)).toBe(1);
    expect(resolveLegacyNumber(0, catalog)).toBe(0);

    const migrated = migrateStoredPositions("138,144,161", undefined, catalog);
    expect(migrated).toEqual({
      ok: true,
      positions: "0:2",
      version: POSITION_INDEX_VERSION,
    });
    const resolved = resolveStoredFileIds("138,144,161", undefined, catalog);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.ids).toEqual([138, 144, 161]);

    const asIndex = resolveStoredFileIds("0:2", POSITION_INDEX_VERSION, catalog);
    expect(asIndex.ok).toBe(true);
    if (!asIndex.ok) return;
    expect(asIndex.ids).toEqual([138, 144, 161]);
  });

  test("sparse folder: a missing number is refused instead of becoming a neighbour", () => {
    const catalog = sparseFolderCatalog([138, 144, 161]);
    const result = migrateStoredPositions("137", undefined, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Position 137 is not in this source/);
    expect(result.error).toMatch(/Refusing to guess a neighbouring position/);
    expect(result.error).not.toMatch(/144/);
  });

  test("ND2/CZI: a pre-0.5.1 0-based range is unchanged after migration", () => {
    const catalog = sequentialCatalog("nd2", 67);
    expect(catalog.ids[0]).toBe(0);
    expect(catalog.labels[0]).toBe("1");
    const migrated = migrateStoredPositions("0:66", undefined, catalog);
    expect(migrated).toEqual({
      ok: true,
      positions: "0:66",
      version: POSITION_INDEX_VERSION,
    });
    const resolved = resolveStoredFileIds("0:66", undefined, catalog);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.ids).toEqual(Array.from({ length: 67 }, (_, index) => index));
    expect(parseLabelPositionList("1-67", catalog).ranges).toEqual([{ start: 0, end: 66 }]);
    expect(formatPositionChip({ start: 0, end: 66 }, catalog)).toBe("1–67");
    expect(formatResolvedPreview(resolved.indices, catalog)).toBe("67 positions: 1 to 67");
  });

  test("ND2: a 1-based hand-edited legacy range is refused rather than shifted", () => {
    const catalog = sequentialCatalog("czi", 10);
    const result = migrateStoredPositions("1:10", undefined, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Position 10 is not in this source/);
  });

  test("catalogFromScan uses source labels when they match the id list", () => {
    const scan = {
      positions: [0, 1],
      positionLabels: ["WellA", "WellB"],
    };
    expect(catalogFromScan("nd2", scan)).toEqual({
      kind: "nd2",
      ids: [0, 1],
      labels: ["WellA", "WellB"],
    });
    expect(parseLabelPositionList("WellB", catalogFromScan("nd2", scan)!).ranges).toEqual([
      { start: 1, end: 1 },
    ]);
  });

  test("typed labels store 0-based indices for ND2 and folder numbers", () => {
    const nd2 = sequentialCatalog("nd2", 30);
    expect(commitDisplayPositionDraft("", "1-5, 21-25", true, nd2)).toEqual({
      positions: "0:4,20:24",
      draft: "",
      invalid: false,
    });
    const folder = sparseFolderCatalog([138, 144, 161]);
    expect(commitDisplayPositionDraft("", "138, 144-161", true, folder)).toEqual({
      positions: "0:2",
      draft: "",
      invalid: false,
    });
    expect(commitDisplayPositionDraft("", "137", true, folder)).toEqual({
      positions: "",
      draft: "137",
      invalid: true,
    });
  });
});
