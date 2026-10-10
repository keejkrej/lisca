import type { HostListDirectoryResult } from "@lisca/contracts";
import type { HostFilePickerOperations } from "@lisca/utils";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { HostFilePickerDialog } from "../src/features/host/host-file-picker-dialog";

const documents: HostListDirectoryResult = {
  path: "C:\\Users\\ana\\Documents",
  parent: "C:\\Users\\ana",
  entries: [
    {
      name: "experiments",
      path: "C:\\Users\\ana\\Documents\\experiments",
      isDirectory: true,
    },
  ],
};

const dataDrive: HostListDirectoryResult = {
  path: "D:\\",
  parent: null,
  entries: [{ name: "imaging", path: "D:\\imaging", isDirectory: true }],
};

const drives = [
  { letter: "C:", path: "C:\\" },
  { letter: "D:", path: "D:\\" },
  { letter: "E:", path: "E:\\" },
];

function listings(path: string | null): HostListDirectoryResult {
  if (path === "D:\\") return dataDrive;
  return documents;
}

function renderPicker(
  overrides: Partial<HostFilePickerOperations> = {},
  mode: "workspace" | "nd2_file" = "workspace",
) {
  const onOpenChange = vi.fn();
  const onPickDirectory = vi.fn();
  const onPickFile = vi.fn();
  const hostPort: HostFilePickerOperations = {
    userHomeDirectory: vi.fn(async () => "C:\\Users\\ana\\Documents"),
    listDirectory: vi.fn(async (path: string | null) => listings(path)),
    createDirectory: vi.fn(async () => "C:\\Users\\ana\\Documents\\new"),
    windowsDrives: vi.fn(async () => ({ windows: true, drives })),
    ...overrides,
  };
  render(() => (
    <HostFilePickerDialog
      open
      hostPort={hostPort}
      mode={mode}
      title="Workspace output folder"
      onOpenChange={onOpenChange}
      onPickDirectory={onPickDirectory}
      onPickFile={onPickFile}
    />
  ));
  return { hostPort, onOpenChange, onPickDirectory, onPickFile };
}

const originalPlatform = navigator.platform;

beforeEach(() => {
  window.scrollTo = () => {};
  Element.prototype.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value: originalPlatform,
  });
  cleanup();
});

describe("HostFilePickerDialog Windows drives and native opener", () => {
  it("lists drive letters and opens the chosen drive", async () => {
    const { hostPort } = renderPicker();
    expect(await screen.findByText("experiments")).not.toBeNull();

    const drive = screen.getByRole("button", { name: "Drive C:" });
    expect(drive.textContent).toContain("C:");
    expect(screen.queryByText("Local Disk")).toBeNull();

    fireEvent.keyDown(drive, { key: "ArrowDown" });
    const option = await screen.findByRole("option", { name: "D:" });
    fireEvent.keyDown(option, { key: "Enter" });

    expect(await screen.findByText("imaging")).not.toBeNull();
    expect(hostPort.listDirectory).toHaveBeenCalledWith("D:\\");
  });

  it("hides the drive menu when the backend is not Windows", async () => {
    renderPicker({
      windowsDrives: vi.fn(async () => ({ windows: false, drives: [] })),
    });
    expect(await screen.findByText("experiments")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /^Drive/ })).toBeNull();
  });

  it("opens Explorer on the desktop and selects the chosen folder", async () => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Win32" });
    const openNativePicker = vi.fn(async () => "E:\\imaging");
    const { onOpenChange, onPickDirectory } = renderPicker({ openNativePicker });
    expect(await screen.findByText("experiments")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open in Explorer" }));
    await waitFor(() => {
      expect(onPickDirectory).toHaveBeenCalledWith("E:\\imaging");
    });
    expect(openNativePicker).toHaveBeenCalledWith({
      directory: true,
      directoryPath: "C:\\Users\\ana\\Documents",
      extensions: [],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the in-app picker open when the native dialog is cancelled", async () => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" });
    const openNativePicker = vi.fn(async () => null);
    const { onOpenChange, onPickDirectory } = renderPicker({
      openNativePicker,
      windowsDrives: vi.fn(async () => ({ windows: false, drives: [] })),
    });
    expect(await screen.findByText("experiments")).not.toBeNull();

    const button = screen.getByRole("button", { name: "Open in Finder" });
    expect(button.textContent).not.toContain("…");
    fireEvent.click(button);
    await waitFor(() => {
      expect(openNativePicker).toHaveBeenCalled();
    });
    expect(onPickDirectory).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("uses a filtered file dialog for an ND2 source", async () => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Win32" });
    const openNativePicker = vi.fn(async () => "D:\\sample.nd2");
    const { onPickFile } = renderPicker({ openNativePicker }, "nd2_file");
    expect(await screen.findByText("experiments")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open in Explorer" }));
    await waitFor(() => {
      expect(onPickFile).toHaveBeenCalledWith("D:\\sample.nd2");
    });
    expect(openNativePicker).toHaveBeenCalledWith({
      directory: false,
      directoryPath: "C:\\Users\\ana\\Documents",
      extensions: ["nd2"],
    });
  });

  it("omits the native opener in the browser", async () => {
    renderPicker();
    expect(await screen.findByText("experiments")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Open in Explorer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open in Finder" })).toBeNull();
  });
});
