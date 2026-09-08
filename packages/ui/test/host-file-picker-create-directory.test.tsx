import type { HostListDirectoryResult } from "@lisca/contracts";
import type { HostFilePickerOperations } from "@lisca/utils";
import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HostFilePickerDialog } from "../src/features/host/host-file-picker-dialog";

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
    ...overrides,
  };
}

afterEach(cleanup);

async function openNewFolderDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Create new folder" }));
  const folderDialog = await screen.findByRole("dialog", { name: "New folder" });
  const nameInput = screen.getByRole("textbox", { name: "Folder name" });
  return { folderDialog, nameInput };
}

describe("HostFilePickerDialog New folder flow", () => {
  it("on a rejected create keeps the sub-dialog open, shows the inline error, and preserves the listing and typed name", async () => {
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => {
        throw new Error(REJECTION);
      }),
    });
    const onOpenChange = vi.fn();

    render(() => (
      <HostFilePickerDialog
        open
        hostPort={hostPort}
        mode="workspace"
        title="Select workspace"
        onOpenChange={onOpenChange}
        onPickDirectory={vi.fn()}
        onPickFile={vi.fn()}
      />
    ));

    // The main listing loads.
    expect(await screen.findByText("existing-file.txt")).not.toBeNull();
    const createButton = screen.getByRole("button", { name: "Create new folder" });
    expect(createButton).not.toHaveProperty("disabled", true);

    const { nameInput } = await openNewFolderDialog();
    fireEvent.input(nameInput, { target: { value: "dupe-name" } });
    expect((nameInput as HTMLInputElement).value).toBe("dupe-name");

    // Submit the name.
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    // The inline alert appears with the rejection message.
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(REJECTION);
    expect(alert.tagName).toBe("P");

    // The "New folder" sub-dialog stays open.
    expect(screen.queryByRole("dialog", { name: "New folder" })).not.toBeNull();
    // The main picker dialog also stays open (the failure did not dismiss the picker).
    expect(screen.queryByRole("dialog", { name: "Select workspace" })).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();

    // The typed name is preserved for editing/retry.
    expect((nameInput as HTMLInputElement).value).toBe("dupe-name");
    // The input is re-enabled after the async settle.
    expect(nameInput).toHaveProperty("disabled", false);

    // The main file listing is NOT replaced by a destructive error block — the
    // existing entry stays rendered and the rejection text appears only in the
    // inline alert (a <p role="alert">), not in the main listing error <div>.
    expect(screen.queryByText("existing-file.txt")).not.toBeNull();
    const rejectionNode = screen.getByText(REJECTION);
    expect(rejectionNode).toBe(alert);

    // The Create button is back to its idle label and enabled (creating() == false).
    const idleCreateButton = screen.getByRole("button", { name: "Create" });
    expect(idleCreateButton.textContent).toBe("Create");
    expect(idleCreateButton).toHaveProperty("disabled", false);
  });

  it("normalizes JSON parse failures to the friendly backend-down message inline", async () => {
    const hostPort = makeHostPort({
      createDirectory: vi.fn(async () => {
        throw new Error("Unexpected end of input; Could not parse JSON");
      }),
    });

    render(() => (
      <HostFilePickerDialog
        open
        hostPort={hostPort}
        mode="workspace"
        title="Select workspace"
        onOpenChange={vi.fn()}
        onPickDirectory={vi.fn()}
        onPickFile={vi.fn()}
      />
    ));

    expect(await screen.findByText("existing-file.txt")).not.toBeNull();

    const { nameInput } = await openNewFolderDialog();
    fireEvent.input(nameInput, { target: { value: "anything" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Could not reach the API server. Ensure the Rust backend is running.",
    );
    // Main listing is still intact.
    expect(screen.queryByText("existing-file.txt")).not.toBeNull();
    expect(screen.queryByRole("dialog", { name: "New folder" })).not.toBeNull();
  });

  it("on a successful create closes the sub-dialog, clears the name, and reloads the listing with the new entry", async () => {
    const hostPort = makeHostPort();

    render(() => (
      <HostFilePickerDialog
        open
        hostPort={hostPort}
        mode="workspace"
        title="Select workspace"
        onOpenChange={vi.fn()}
        onPickDirectory={vi.fn()}
        onPickFile={vi.fn()}
      />
    ));

    expect(await screen.findByText("existing-file.txt")).not.toBeNull();

    const { nameInput } = await openNewFolderDialog();
    fireEvent.input(nameInput, { target: { value: "new-folder" } });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    // Sub-dialog closes and no inline error is shown.
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "New folder" })).toBeNull());
    expect(screen.queryByRole("alert")).toBeNull();

    // The listing reloads and the new folder appears alongside the existing entry.
    expect(await screen.findByText("new-folder")).not.toBeNull();
    expect(screen.queryByText("existing-file.txt")).not.toBeNull();
  });
});
