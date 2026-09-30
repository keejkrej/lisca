import type { HostListDirectoryResult } from "@lisca/contracts";
import { HOST_FILE_PICKER_FAVORITES_STORAGE_KEY } from "@lisca/ui-headless/host-file-picker-state";
import type { HostFilePickerOperations } from "@lisca/utils";
import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { HostFilePickerDialog } from "../src/features/host/host-file-picker-dialog";

const listings: Record<string, HostListDirectoryResult> = {
  "/home/user": {
    path: "/home/user",
    parent: "/home",
    entries: [
      { name: ".config", path: "/home/user/.config", isDirectory: true },
      { name: "data", path: "/home/user/data", isDirectory: true },
    ],
  },
  "/home/user/data": {
    path: "/home/user/data",
    parent: "/home/user",
    entries: [{ name: "assay.json", path: "/home/user/data/assay.json", isDirectory: false }],
  },
};

function makeHostPort(): HostFilePickerOperations {
  return {
    userHomeDirectory: vi.fn(async () => "/home/user"),
    listDirectory: vi.fn(async (path: string | null) => listings[path ?? "/home/user"]!),
    createDirectory: vi.fn(async () => "/home/user/new"),
  };
}

function renderPicker() {
  render(() => (
    <HostFilePickerDialog
      open
      hostPort={makeHostPort()}
      mode="assay_json_file"
      title="Open assay"
      onOpenChange={vi.fn()}
      onPickDirectory={vi.fn()}
      onPickFile={vi.fn()}
    />
  ));
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("HostFilePickerDialog hidden items and favorites", () => {
  it("hides dot entries by default and shows them when toggled", async () => {
    renderPicker();
    expect(await screen.findByText("data")).not.toBeNull();
    expect(screen.queryByText(".config")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show hidden items" }));
    expect(screen.getByText(".config")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Hide hidden items" }));
    expect(screen.queryByText(".config")).toBeNull();
  });

  it("stars a folder, persists it, and navigates from the favorite chip", async () => {
    renderPicker();
    await screen.findByText("data");

    fireEvent.click(screen.getByRole("button", { name: "Add data to favorites" }));
    expect(JSON.parse(localStorage.getItem(HOST_FILE_PICKER_FAVORITES_STORAGE_KEY)!)).toEqual([
      "/home/user/data",
    ]);

    const chips = screen.getByRole("list", { name: "Favorite folders" });
    fireEvent.click(chips.querySelector("button[title='Go to /home/user/data']")!);
    expect(await screen.findByText("assay.json")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Remove data from favorites" }));
    expect(screen.queryByRole("list", { name: "Favorite folders" })).toBeNull();
    expect(JSON.parse(localStorage.getItem(HOST_FILE_PICKER_FAVORITES_STORAGE_KEY)!)).toEqual([]);
  });

  it("shows recent picks as compact chips that open directly", async () => {
    const onPickRecent = vi.fn();
    render(() => (
      <HostFilePickerDialog
        open
        hostPort={makeHostPort()}
        mode="assay_json_file"
        recentItems={[
          { path: "/home/user/data/TF84/assay.json", label: "TF84" },
          { path: "/home/user/data/TF85/assay.json" },
          ...[1, 2, 3, 4].map((n) => ({ path: `/old/${n}/assay.json`, label: `Old ${n}` })),
        ]}
        title="Open assay"
        onOpenChange={vi.fn()}
        onPickDirectory={vi.fn()}
        onPickFile={vi.fn()}
        onPickRecent={onPickRecent}
      />
    ));
    await screen.findByText("data");

    const recent = screen.getByRole("list", { name: "Recent" });
    expect(recent.querySelectorAll("li")).toHaveLength(5);
    expect(screen.queryByText("Old 4")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "TF84" }));
    expect(onPickRecent).toHaveBeenCalledWith("/home/user/data/TF84/assay.json");
  });
});
