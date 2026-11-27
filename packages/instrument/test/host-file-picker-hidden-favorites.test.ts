import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { HostListDirectoryResult } from "@lisca/contracts";
import { HOST_FILE_PICKER_FAVORITES_STORAGE_KEY } from "@lisca/ui-headless/host-file-picker-state";
import type { HostFilePickerOperations } from "@lisca/utils";
import { Layer, Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { HostFilePickerPort } from "../src/host/folder-source-parse-modal";
import {
  HostFilePickerDialog,
  type HostFilePickerRecentItem,
} from "../src/host/host-file-picker-dialog";
import {
  cleanupMounted,
  clickElement,
  flushMicrotasks,
  mountTest,
  waitForCondition,
} from "./render-helper";

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
    windowsDrives: vi.fn(async () => ({ windows: false, drives: [] })),
  };
}

async function mountPicker(options?: {
  readonly recentItems?: readonly HostFilePickerRecentItem[];
  readonly onPickRecent?: (path: string) => void;
  readonly onRemoveRecent?: (path: string) => void;
}) {
  const Msg = UiSchema.TaggedEnum({
    Noop: {},
    PickRecent: { path: Schema.String },
    RemoveRecent: { path: Schema.String },
  });

  const Host = Html.component({
    name: "HostFilePickerFavHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Msg,
  }).make({
    init: () => ({}),
    update: {
      Noop: ($) => $.model,
      PickRecent: ($, { path }) => {
        options?.onPickRecent?.(path);
        return $.model;
      },
      RemoveRecent: ($, { path }) => {
        options?.onRemoveRecent?.(path);
        return $.model;
      },
    },
    view: (h) =>
      HostFilePickerDialog(h, {
        open: true,
        mode: "assay_json_file",
        title: "Open assay",
        ...(options?.recentItems ? { recentItems: options.recentItems } : {}),
        ...(options?.onPickRecent ? { onPickRecent: (path) => Msg.PickRecent({ path }) } : {}),
        ...(options?.onRemoveRecent
          ? { onRemoveRecent: (path) => Msg.RemoveRecent({ path }) }
          : {}),
        onOpenChange: () => Msg.Noop(),
        onPickDirectory: () => Msg.Noop(),
        onPickFile: () => Msg.Noop(),
      }),
  });

  await mountTest(Host, {}, { layer: Layer.succeed(HostFilePickerPort, makeHostPort()) });
}

beforeEach(() => localStorage.clear());
afterEach(cleanupMounted);

describe("HostFilePickerDialog hidden items and favorites", () => {
  it("hides dot entries by default and shows them when toggled", async () => {
    await mountPicker();
    await waitForCondition(() => document.body.textContent?.includes("data"));
    expect(document.body.textContent).not.toContain(".config");

    clickElement(document.body.querySelector('button[aria-label="Show hidden items"]')!);
    await flushMicrotasks();
    expect(document.body.textContent).toContain(".config");

    clickElement(document.body.querySelector('button[aria-label="Hide hidden items"]')!);
    await flushMicrotasks();
    expect(document.body.textContent).not.toContain(".config");
  });

  it("stars a folder, persists it, and navigates from the favorite chip", async () => {
    await mountPicker();
    await waitForCondition(() => document.body.textContent?.includes("data"));

    clickElement(document.body.querySelector('button[aria-label="Add data to favorites"]')!);
    await flushMicrotasks();
    expect(JSON.parse(localStorage.getItem(HOST_FILE_PICKER_FAVORITES_STORAGE_KEY)!)).toEqual([
      "/home/user/data",
    ]);

    const chips = document.body.querySelector('ul[aria-label="Favorite folders"]')!;
    expect(chips).not.toBeNull();
    clickElement(chips.querySelector("button[title='Go to /home/user/data']")!);
    await waitForCondition(() => document.body.textContent?.includes("assay.json"));

    clickElement(document.body.querySelector('button[aria-label="Remove data from favorites"]')!);
    await flushMicrotasks();
    expect(document.body.querySelector('ul[aria-label="Favorite folders"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem(HOST_FILE_PICKER_FAVORITES_STORAGE_KEY)!)).toEqual([]);
  });

  it("shows recent picks as compact chips that open directly", async () => {
    const onPickRecent = vi.fn();
    await mountPicker({
      recentItems: [
        { path: "/home/user/data/TF84/assay.json", label: "TF84" },
        { path: "/home/user/data/TF85/assay.json" },
        ...[1, 2, 3, 4].map((n) => ({ path: `/old/${n}/assay.json`, label: `Old ${n}` })),
      ],
      onPickRecent,
    });
    await waitForCondition(() => document.body.textContent?.includes("data"));

    const recent = document.body.querySelector('ul[aria-label="Recent"]')!;
    expect(recent).not.toBeNull();
    expect(recent.querySelectorAll("li")).toHaveLength(5);
    expect(document.body.textContent).not.toContain("Old 4");
    expect(
      Array.from(document.body.querySelectorAll("button")).find((btn) =>
        /from recent/.test(btn.getAttribute("aria-label") ?? ""),
      ),
    ).toBeUndefined();

    const tf84Btn = Array.from(recent.querySelectorAll("button")).find(
      (btn) => btn.textContent?.trim() === "TF84",
    )!;
    clickElement(tf84Btn);
    await flushMicrotasks();
    expect(onPickRecent).toHaveBeenCalledWith("/home/user/data/TF84/assay.json");
  });

  it("removes a recent chip without opening it", async () => {
    const onPickRecent = vi.fn();
    const onRemoveRecent = vi.fn();
    await mountPicker({
      recentItems: [
        { path: "/home/user/data/TF84/assay.json", label: "TF84" },
        { path: "/home/user/data/TF85/assay.json" },
      ],
      onPickRecent,
      onRemoveRecent,
    });
    await waitForCondition(() => document.body.textContent?.includes("data"));

    clickElement(document.body.querySelector('button[aria-label="Remove TF84 from recent"]')!);
    await flushMicrotasks();
    expect(onRemoveRecent).toHaveBeenCalledWith("/home/user/data/TF84/assay.json");
    expect(onPickRecent).not.toHaveBeenCalled();

    clickElement(document.body.querySelector('button[aria-label="Remove TF85 from recent"]')!);
    await flushMicrotasks();
    expect(onRemoveRecent).toHaveBeenCalledWith("/home/user/data/TF85/assay.json");
    expect(onPickRecent).not.toHaveBeenCalled();
  });
});
