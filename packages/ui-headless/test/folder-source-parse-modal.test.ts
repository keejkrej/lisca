import { describe, expect, it, vi } from "vite-plus/test";

import {
  createFolderSourceParseModal,
  folderParseConfirmError,
} from "../src/folder-source-parse-modal";

describe("createFolderSourceParseModal", () => {
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

    const modal = createFolderSourceParseModal({
      path: "/data",
      hostPort,
      onConfirm,
    });
    const listener = vi.fn();
    modal.subscribe(listener);

    await vi.waitFor(() => {
      expect(modal.getState().detecting).toBe(false);
    });

    expect(listener).toHaveBeenCalled();
    expect(modal.getState().subfolderTemplate).toBe("Pos{p}");
    expect(modal.getState().filenameTemplate).toContain("{t}");
    expect(modal.getState().detected).toBe(true);

    modal.confirm();

    expect(onConfirm).toHaveBeenCalledWith({
      kind: "folder",
      path: "/data",
      subfolderTemplate: "Pos{p}",
      filenameTemplate: modal.getState().filenameTemplate.trim(),
    });

    modal.dispose();
  });

  it("requires filename template on confirm", () => {
    expect(
      folderParseConfirmError({
        path: "/data",
        filenameTemplate: "   ",
      }),
    ).toBe("Filename template is required.");

    const onConfirm = vi.fn();
    const modal = createFolderSourceParseModal({
      hostPort: { listDirectory: vi.fn(async () => ({ entries: [] })) },
      onConfirm,
    });
    modal.openForPath("/data");
    modal.setFilenameTemplate("   ");
    modal.confirm();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(modal.getState().error).toBe("Filename template is required.");

    modal.dispose();
  });
});
