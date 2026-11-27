import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { HostListDirectoryResult } from "@lisca/contracts";
import type { HostFilePickerOperations } from "@lisca/utils";
import { Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { HostFilePickerPort } from "../src/host/folder-source-parse-modal";
import { HostFilePickerDialog } from "../src/host/host-file-picker-dialog";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  mountTest,
  setInputValue,
  waitForCondition,
} from "./render-helper";

const REJECTION = "failed to create directory: File exists (os error 17)";

const homeListing: HostListDirectoryResult = {
  path: "/home/user",
  parent: null,
  entries: [
    { name: "existing-file.txt", path: "/home/user/existing-file.txt", isDirectory: false },
  ],
};

const reloadedListing: HostListDirectoryResult = {
  path: "/home/user",
  parent: null,
  entries: [
    { name: "existing-file.txt", path: "/home/user/existing-file.txt", isDirectory: false },
    { name: "new-folder", path: "/home/user/new-folder", isDirectory: true },
  ],
};

function makeHostPort(overrides: Partial<HostFilePickerOperations> = {}): HostFilePickerOperations {
  let listCalls = 0;
  const listDirectory = vi.fn(async () => {
    listCalls += 1;
    return listCalls <= 1 ? homeListing : reloadedListing;
  });
  return {
    userHomeDirectory: vi.fn(async () => "/home/user"),
    listDirectory,
    createDirectory: vi.fn(async () => "/home/user/new-folder"),
    windowsDrives: vi.fn(async () => ({ windows: false, drives: [] })),
    ...overrides,
  };
}

function findDialogByTitle(title: string): HTMLElement | null {
  for (const dialog of document.body.querySelectorAll('[role="dialog"]')) {
    const labelledBy = dialog.getAttribute("aria-labelledby");
    const heading = labelledBy ? document.getElementById(labelledBy) : null;
    if (heading?.textContent?.trim() === title) {
      return dialog as HTMLElement;
    }
  }
  return null;
}

function findButtonByText(text: string): HTMLButtonElement | null {
  return (
    (Array.from(document.body.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === text,
    ) as HTMLButtonElement | undefined) ?? null
  );
}

async function mountPicker(hostPort: HostFilePickerOperations, onOpenChange = vi.fn()) {
  const Msg = UiSchema.TaggedEnum({
    OpenChanged: { open: Schema.Boolean },
    Picked: { path: Schema.String },
  });

  const Host = Html.component({
    name: "HostFilePickerCreateDirHost",
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
      Picked: ($) => $.model,
    },
    view: (h) =>
      HostFilePickerDialog(h, {
        open: true,
        mode: "workspace",
        title: "Select workspace",
        onOpenChange: (open) => Msg.OpenChanged({ open }),
        onPickDirectory: (path) => Msg.Picked({ path }),
        onPickFile: (path) => Msg.Picked({ path }),
      }),
  });

  await mountTest(Host, {}, { layer: Layer.succeed(HostFilePickerPort, hostPort) });
}

async function openNewFolderDialog() {
  const createBtn = document.body.querySelector(
    'button[aria-label="Create new folder"]',
  ) as HTMLButtonElement;
  clickElement(createBtn);
  const folderDialog = await waitForCondition(() => findDialogByTitle("New folder"));
  const nameInput = document.getElementById("new-folder-name") as HTMLInputElement;
  return { folderDialog, nameInput };
}

afterEach(cleanupMounted);

describe("HostFilePickerDialog New folder flow", () => {
  it("on a rejected create keeps the sub-dialog open, shows the inline error, and preserves the listing and typed name", async () => {
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => {
        throw new Error(REJECTION);
      }),
    });
    const onOpenChange = vi.fn();

    await mountPicker(hostPort, onOpenChange);

    await waitForCondition(() => document.body.textContent?.includes("existing-file.txt"));
    const createButton = document.body.querySelector(
      'button[aria-label="Create new folder"]',
    ) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);

    const { nameInput } = await openNewFolderDialog();
    setInputValue(nameInput, "dupe-name");
    await flushMicrotasks();
    expect(nameInput.value).toBe("dupe-name");

    clickElement(findButtonByText("Create")!);

    const alert = await waitForCondition(
      () => document.body.querySelector('[role="alert"]') as HTMLElement | null,
    );
    expect(alert.textContent).toBe(REJECTION);
    expect(alert.tagName).toBe("P");

    expect(findDialogByTitle("New folder")).not.toBeNull();
    expect(findDialogByTitle("Select workspace")).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();

    expect(nameInput.value).toBe("dupe-name");
    expect(nameInput.disabled).toBe(false);

    expect(document.body.textContent).toContain("existing-file.txt");

    const idleCreateButton = findButtonByText("Create")!;
    expect(idleCreateButton.textContent).toBe("Create");
    expect(idleCreateButton.disabled).toBe(false);
  });

  it("normalizes JSON parse failures to the friendly backend-down message inline", async () => {
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => {
        throw new Error("Unexpected end of input; Could not parse JSON");
      }),
    });

    await mountPicker(hostPort);
    await waitForCondition(() => document.body.textContent?.includes("existing-file.txt"));

    const { nameInput } = await openNewFolderDialog();
    setInputValue(nameInput, "anything");
    await flushMicrotasks();
    clickElement(findButtonByText("Create")!);

    const alert = await waitForCondition(
      () => document.body.querySelector('[role="alert"]') as HTMLElement | null,
    );
    expect(alert.textContent).toBe(
      "Could not reach the API server. Ensure the Rust backend is running.",
    );
    expect(document.body.textContent).toContain("existing-file.txt");
    expect(findDialogByTitle("New folder")).not.toBeNull();
  });

  it("on a successful create closes the sub-dialog, clears the name, and reloads the listing with the new entry", async () => {
    const hostPort = makeHostPort();

    await mountPicker(hostPort);
    await waitForCondition(() => document.body.textContent?.includes("existing-file.txt"));

    const { nameInput } = await openNewFolderDialog();
    setInputValue(nameInput, "new-folder");
    await flushMicrotasks();

    clickElement(findButtonByText("Create")!);

    await waitForCondition(() => findDialogByTitle("New folder") === null);
    expect(document.body.querySelector('[role="alert"]')).toBeNull();

    await waitForCondition(() => document.body.textContent?.includes("new-folder"));
    expect(document.body.textContent).toContain("existing-file.txt");
  });
});
