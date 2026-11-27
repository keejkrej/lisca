import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { PathPickerField } from "../src/host/path-picker-field";
import { cleanupMounted, clickElement, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

describe("PathPickerField", () => {
  it("renders a semantic picker trigger with a persistent trailing action", async () => {
    const onOpen = vi.fn();
    const Msg = UiSchema.TaggedEnum({ Open: {} });

    const Host = Html.component({
      name: "PathPickerHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: {
        Open: ($) => {
          onOpen();
          return $.model;
        },
      },
      view: (h) =>
        PathPickerField(h, {
          id: "workspace",
          label: "Workspace",
          placeholder: "Click to choose folder…",
          value: "/data/workspace",
          onOpen: Msg.Open(),
        }),
    });

    const { container } = await mountTest(Host, {});

    const trigger = container.querySelector(
      'button[aria-label="Workspace: /data/workspace. Browse"]',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.textContent).toContain("/data/workspace");
    expect(trigger.textContent).toContain("Browse");

    clickElement(trigger);
    await flushMicrotasks();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("shows the placeholder without dropping the Browse cue", async () => {
    const Msg = UiSchema.TaggedEnum({ Open: {} });

    const Host = Html.component({
      name: "PathPickerPlaceholderHost",
      props: Schema.Struct({}),
      model: Schema.Struct({}),
      message: Msg,
    }).make({
      init: () => ({}),
      update: { Open: ($) => $.model },
      view: (h) =>
        PathPickerField(h, {
          id: "source",
          label: "Source",
          placeholder: "Click to choose source…",
          value: "",
          onOpen: Msg.Open(),
        }),
    });

    const { container } = await mountTest(Host, {});

    const trigger = container.querySelector(
      'button[aria-label="Source: Click to choose source…. Browse"]',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain("Click to choose source…");
    expect(trigger.textContent).toContain("Browse");
  });
});
