import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import {
  useFolderSourceParseModal,
  folderParseConfirmError,
} from "../src/folder-source-parse-modal";

describe("useFolderSourceParseModal", () => {
  it("detects templates and confirms folder source", async () => {
    const onConfirm = vi.fn();
    const hostPort = {
      listDirectory: vi.fn(async (path: string | null) => {
        if (path === "/data") {
          return {
            entries: [{ name: "Pos0", path: "/data/Pos0", isDirectory: true }],
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

    let result!: ReturnType<typeof useFolderSourceParseModal>;
    render(() => {
      result = useFolderSourceParseModal(() => ({
        path: "/data",
        hostPort,
        onConfirm,
      }));
      return null;
    });

    await vi.waitFor(() => {
      expect(result.detecting()).toBe(false);
    });

    expect(result.subfolderTemplate()).toBe("Pos{p}");
    expect(result.filenameTemplate()).toContain("{t}");

    result.confirm();

    expect(onConfirm).toHaveBeenCalledWith({
      kind: "folder",
      path: "/data",
      subfolderTemplate: "Pos{p}",
      filenameTemplate: result.filenameTemplate().trim(),
    });
  });

  it("requires filename template on confirm", () => {
    expect(
      folderParseConfirmError({
        path: "/data",
        filenameTemplate: "   ",
      }),
    ).toBe("Filename template is required.");
  });
});
