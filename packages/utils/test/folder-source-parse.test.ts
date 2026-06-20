import { describe, expect, it, vi } from "vitest";

import {
  detectFolderSourceTemplate,
  filenameStem,
  isSupportedImageName,
  templateRegex,
} from "../src/folder-source-parse";

describe("folder-source-parse", () => {
  it("matches template tokens", () => {
    const regex = templateRegex("Pos{p}");
    expect(regex.test("Pos1")).toBe(true);
    expect(regex.test("pos42")).toBe(true);
    expect(regex.test("WellPos1")).toBe(false);
  });

  it("detects supported image names", () => {
    expect(isSupportedImageName("img_001.tif")).toBe(true);
    expect(isSupportedImageName("mask_seg.npy")).toBe(false);
  });

  it("strips filename extensions", () => {
    expect(filenameStem("img_001.tif")).toBe("img_001");
  });

  it("detects folder presets from directory listings", async () => {
    const hostPort = {
      listDirectory: vi.fn(async (path: string | null) => {
        if (path === "/data") {
          return {
            entries: [
              { name: "Pos0", path: "/data/Pos0", isDirectory: true },
              { name: "Pos1", path: "/data/Pos1", isDirectory: true },
            ],
          };
        }
        if (path === "/data/Pos0") {
          return {
            entries: [
              { name: "img_0_0_0.jpg", path: "/data/Pos0/img_0_0_0.jpg", isDirectory: false },
            ],
          };
        }
        return { entries: [] };
      }),
    };

    const preset = await detectFolderSourceTemplate("/data", hostPort);
    expect(preset?.subfolderTemplate).toBe("Pos{p}");
    expect(preset?.filenameTemplate).toContain("{t}");
  });
});
