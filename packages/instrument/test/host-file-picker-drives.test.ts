import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { HostListDirectoryResult } from "@lisca/contracts";
import type { HostFilePickerOperations } from "@lisca/utils";
import { Layer, Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { HostFilePickerPort } from "../src/host/folder-source-parse-modal";
import { HostFilePickerDialog } from "../src/host/host-file-picker-dialog";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  mountTest,
  waitForCondition,
} from "./render-helper";

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

async function renderPicker(
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

  const Msg = UiSchema.TaggedEnum({
    OpenChanged: { open: Schema.Boolean },
    PickedDirectory: { path: Schema.String },
    PickedFile: { path: Schema.String },
  });

  const Host = Html.component({
    name: "HostFilePickerDrivesHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Msg,
  }).make({
    init: () => ({}),
    update: {
      OpenChanged: ($, { open }) => {
        onOpenChange(open);
        return $.model;
      },
      PickedDirectory: ($, { path }) => {
        onPickDirectory(path);
        return $.model;
      },
      PickedFile: ($, { path }) => {
        onPickFile(path);
        return $.model;
      },
    },
    view: (h) =>
      HostFilePickerDialog(h, {
        open: true,
        mode,
        title: "Workspace output folder",
        onOpenChange: (open) => Msg.OpenChanged({ open }),
        onPickDirectory: (path) => Msg.PickedDirectory({ path }),
        onPickFile: (path) => Msg.PickedFile({ path }),
      }),
  });

  await mountTest(Host, {}, { layer: Layer.succeed(HostFilePickerPort, hostPort) });
  return { hostPort, onOpenChange, onPickDirectory, onPickFile };
}

const originalPlatform = navigator.platform;

beforeEach(() => {
  window.scrollTo = () => {};
  Element.prototype.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
});

afterEach(async () => {
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value: originalPlatform,
  });
  await cleanupMounted();
});

function getByLabel(selector: string, label: string): HTMLElement {
  const el = document.body.querySelector(
    `${selector}[aria-label="${label}"]`,
  ) as HTMLElement | null;
  expect(el).not.toBeNull();
  return el!;
}

function expectFollows(
  earlierName: string,
  laterName: string,
  laterRole: "button" | "combobox" = "button",
) {
  const earlier = getByLabel("button", earlierName);
  const later =
    laterRole === "combobox"
      ? (document.body.querySelector(
          '[role="combobox"][aria-label="' + laterName + '"]',
        ) as HTMLElement)
      : getByLabel("button", laterName);
  expect(later).not.toBeNull();
  expect(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
}

describe("HostFilePickerDialog Windows drives and native opener", () => {
  it("lists drive letters and opens the chosen drive", async () => {
    const { hostPort } = await renderPicker();
    await waitForCondition(() => document.body.textContent?.includes("experiments"));

    const drive = await waitForCondition(
      () =>
        document.body.querySelector('[role="combobox"][aria-label="Drive"]') as HTMLElement | null,
    );
    expect(drive.textContent).toContain("C:");
    expect(document.body.textContent).not.toContain("Local Disk");

    drive.click();
    await flushMicrotasks();

    const option = await waitForCondition(
      () =>
        Array.from(document.body.querySelectorAll('[role="option"]')).find(
          (el) => el.textContent?.trim() === "D:",
        ) as HTMLElement | undefined,
    );
    option.click();
    await flushMicrotasks();

    await waitForCondition(() => document.body.textContent?.includes("imaging"));
    expect(hostPort.listDirectory).toHaveBeenCalledWith("D:\\");
  });

  it("hides the drive menu when the backend is not Windows", async () => {
    await renderPicker({
      windowsDrives: vi.fn(async () => ({ windows: false, drives: [] })),
    });
    await waitForCondition(() => document.body.textContent?.includes("experiments"));
    expect(document.body.querySelector('[role="combobox"][aria-label="Drive"]')).toBeNull();
  });

  it("opens Explorer on the desktop and selects the chosen folder", async () => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Win32" });
    const openNativePicker = vi.fn(async () => "E:\\imaging");
    const { onOpenChange, onPickDirectory } = await renderPicker({ openNativePicker });
    await waitForCondition(() => document.body.textContent?.includes("experiments"));

    const opener = await waitForCondition(
      () =>
        document.body.querySelector(
          'button[aria-label="Open in Explorer"]',
        ) as HTMLButtonElement | null,
    );
    clickElement(opener);
    await waitForCondition(() => onPickDirectory.mock.calls.length > 0);
    expect(onPickDirectory).toHaveBeenCalledWith("E:\\imaging");
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
    const { onOpenChange, onPickDirectory } = await renderPicker({
      openNativePicker,
      windowsDrives: vi.fn(async () => ({ windows: false, drives: [] })),
    });
    await waitForCondition(() => document.body.textContent?.includes("experiments"));

    const button = await waitForCondition(
      () =>
        document.body.querySelector(
          'button[aria-label="Open in Finder"]',
        ) as HTMLButtonElement | null,
    );
    expect(button.textContent?.trim()).toBe("");
    clickElement(button);
    await waitForCondition(() => openNativePicker.mock.calls.length > 0);
    expect(onPickDirectory).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("uses a filtered file dialog for an ND2 source", async () => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Win32" });
    const openNativePicker = vi.fn(async () => "D:\\sample.nd2");
    const { onPickFile } = await renderPicker({ openNativePicker }, "nd2_file");
    await waitForCondition(() => document.body.textContent?.includes("experiments"));

    const opener = await waitForCondition(
      () =>
        document.body.querySelector(
          'button[aria-label="Open in Explorer"]',
        ) as HTMLButtonElement | null,
    );
    clickElement(opener);
    await waitForCondition(() => onPickFile.mock.calls.length > 0);
    expect(onPickFile).toHaveBeenCalledWith("D:\\sample.nd2");
    expect(openNativePicker).toHaveBeenCalledWith({
      directory: false,
      directoryPath: "C:\\Users\\ana\\Documents",
      extensions: ["nd2"],
    });
  });

  it("omits the native opener in the browser", async () => {
    await renderPicker();
    await waitForCondition(() => document.body.textContent?.includes("experiments"));
    await waitForCondition(() =>
      document.body.querySelector('[role="combobox"][aria-label="Drive"]'),
    );
    expect(document.body.querySelector('button[aria-label="Open in Explorer"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label="Open in Finder"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Open in Explorer");
    expectFollows("Create new folder", "Drive", "combobox");
  });

  it("keeps up, home, and new folder ahead of the native icon and drive menu", async () => {
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Win32" });
    await renderPicker({ openNativePicker: vi.fn(async () => null) });
    await waitForCondition(() => document.body.textContent?.includes("experiments"));

    const opener = await waitForCondition(
      () =>
        document.body.querySelector(
          'button[aria-label="Open in Explorer"]',
        ) as HTMLButtonElement | null,
    );
    expect(opener.textContent?.trim()).toBe("");
    expect(document.body.textContent).not.toContain("Open in Explorer");
    expectFollows("Go up one directory", "Go to home directory");
    expectFollows("Go to home directory", "Create new folder");
    expectFollows("Create new folder", "Open in Explorer");
    expectFollows("Open in Explorer", "Drive", "combobox");
  });
});
