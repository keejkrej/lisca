import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { SourcePickerField } from "../src/host/source-picker-field";
import {
  cleanupMounted,
  flushMicrotasks,
  keyDownElement,
  mountTest,
  waitForCondition,
} from "./render-helper";

afterEach(cleanupMounted);

async function mountField() {
  const handlers = {
    onOpenFolder: vi.fn(),
    onOpenNd2: vi.fn(),
    onOpenCzi: vi.fn(),
  };

  const Msg = UiSchema.TaggedEnum({
    OpenFolder: {},
    OpenNd2: {},
    OpenCzi: {},
  });

  const Host = Html.component({
    name: "SourcePickerFieldHost",
    props: Schema.Struct({}),
    model: Schema.Struct({}),
    message: Msg,
  }).make({
    init: () => ({}),
    update: {
      OpenFolder: ($) => {
        handlers.onOpenFolder();
        return $.model;
      },
      OpenNd2: ($) => {
        handlers.onOpenNd2();
        return $.model;
      },
      OpenCzi: ($) => {
        handlers.onOpenCzi();
        return $.model;
      },
    },
    view: (h) =>
      SourcePickerField(h, {
        id: "source",
        label: "Source",
        placeholder: "Click to choose source…",
        value: "",
        onOpenFolder: Msg.OpenFolder(),
        onOpenNd2: Msg.OpenNd2(),
        onOpenCzi: Msg.OpenCzi(),
      }),
  });

  await mountTest(Host, {});
  return handlers;
}

function findMenuItem(pattern: RegExp): HTMLElement | null {
  return (
    (Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((el) =>
      pattern.test(el.textContent ?? ""),
    ) as HTMLElement | undefined) ?? null
  );
}

async function openMenu() {
  const trigger = document.body.querySelector(
    'button[aria-label="Source: Click to choose source…. Browse"]',
  ) as HTMLButtonElement;
  expect(trigger).not.toBeNull();
  trigger.focus();
  keyDownElement(trigger, "ArrowDown");
  await flushMicrotasks();
}

describe("SourcePickerField", () => {
  it("opens a format menu from the path field and routes the chosen format", async () => {
    const handlers = await mountField();
    await openMenu();

    const folderItem = await waitForCondition(() => findMenuItem(/Folder/));
    expect(folderItem).toBeTruthy();

    const nd2 = findMenuItem(/ND2/)!;
    expect(nd2).not.toBeNull();
    nd2.click();
    await flushMicrotasks();

    expect(handlers.onOpenNd2).toHaveBeenCalledOnce();
    expect(handlers.onOpenFolder).not.toHaveBeenCalled();
    expect(handlers.onOpenCzi).not.toHaveBeenCalled();
  });

  it("offers only source formats, with no recent list", async () => {
    await mountField();
    await openMenu();

    expect(await waitForCondition(() => findMenuItem(/Folder/))).toBeTruthy();
    expect(findMenuItem(/ND2/)).toBeTruthy();
    expect(findMenuItem(/CZI/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("Recent");
  });
});
