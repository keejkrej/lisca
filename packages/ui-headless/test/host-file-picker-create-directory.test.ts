import type { HostListDirectoryResult } from "@lisca/contracts";
import type { HostFilePickerOperations } from "@lisca/utils";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useHostFilePickerState } from "../src/host-file-picker-state";

const homeListing: HostListDirectoryResult = {
  path: "/home/user",
  parent: null,
  entries: [
    { name: "existing-file.txt", path: "/home/user/existing-file.txt", isDirectory: false },
  ],
};

function makeHostPort(overrides: Partial<HostFilePickerOperations> = {}): HostFilePickerOperations {
  return {
    userHomeDirectory: vi.fn(async () => "/home/user"),
    listDirectory: vi.fn(async () => homeListing),
    createDirectory: vi.fn(async () => "/home/user/new-folder"),
    ...overrides,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountPicker(hostPort: HostFilePickerOperations) {
  const [open] = createSignal(true);
  let result!: ReturnType<typeof useHostFilePickerState>;
  render(() => {
    result = useHostFilePickerState(() => ({
      open: open(),
      mode: "workspace",
      hostPort,
      onOpenChange: vi.fn(),
      onPickDirectory: vi.fn(),
      onPickFile: vi.fn(),
    }));
    return null;
  });
  return () => result;
}

afterEach(cleanup);

describe("useHostFilePickerState.createDirectory contract", () => {
  it("rejects with the backend message when hostPort.createDirectory rejects", async () => {
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => {
        throw new Error("failed to create directory: File exists (os error 17)");
      }),
    });
    const picker = mountPicker(hostPort);
    await flush();

    expect(picker().list()?.path).toBe("/home/user");

    let caught: unknown = null;
    try {
      await picker().createDirectory("dupe-name");
    } catch (cause) {
      caught = cause;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("failed to create directory: File exists (os error 17)");
    // The create failure must NOT leak into the shared main-listing error surface.
    expect(picker().error()).toBeNull();
    // hostPort.createDirectory was attempted with the current path and the requested name.
    expect(hostPort.createDirectory).toHaveBeenCalledWith("/home/user", "dupe-name");
    // The listing stays intact (it is not replaced by an error block).
    expect(picker().list()?.entries ?? []).toHaveLength(1);
  });

  it("normalizes JSON parse failures into the friendly backend-down message", async () => {
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => {
        throw new Error("Unexpected end of input; Could not parse JSON");
      }),
    });
    const picker = mountPicker(hostPort);
    await flush();

    let caught: unknown = null;
    try {
      await picker().createDirectory("anything");
    } catch (cause) {
      caught = cause;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(
      "Could not reach the API server. Ensure the Rust backend is running.",
    );
    expect(picker().error()).toBeNull();
  });

  it("reloads the listing and resolves on a successful create", async () => {
    let created = false;
    const reloadedListing: HostListDirectoryResult = {
      path: "/home/user",
      parent: null,
      entries: [
        { name: "existing-file.txt", path: "/home/user/existing-file.txt", isDirectory: false },
        { name: "new-folder", path: "/home/user/new-folder", isDirectory: true },
      ],
    };
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => {
        created = true;
        return "/home/user/new-folder";
      }),
      listDirectory: vi.fn(async () => (created ? reloadedListing : homeListing)),
    });
    const picker = mountPicker(hostPort);
    await flush();

    expect(picker().list()?.entries ?? []).toHaveLength(1);

    // Resolves normally on success (does not throw).
    await picker().createDirectory("new-folder");

    const entries = picker().list()?.entries ?? [];
    expect(entries.some((entry) => entry.name === "new-folder")).toBe(true);
    expect(picker().error()).toBeNull();
  });

  it("relays a post-create relisting failure through the main listing surface, not the create promise", async () => {
    const reloadError = new Error("failed to list directory: Not a directory (os error 20)");
    let listCalls = 0;
    const listDirectory = vi.fn(async () => {
      listCalls += 1;
      // First (initial) load succeeds; the post-create reload fails.
      if (listCalls === 1) return homeListing;
      throw reloadError;
    });
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => "/home/user/new-folder"),
      listDirectory,
    });
    const picker = mountPicker(hostPort);
    await flush();

    // createDirectory resolves (the create itself succeeded), but the subsequent
    // reload failure lands in loadPath's own main-listing error surface.
    await expect(picker().createDirectory("new-folder")).resolves.toBeUndefined();
    expect(picker().error()).toBe("failed to list directory: Not a directory (os error 20)");
    expect(picker().list()).toBeNull();
  });
});
