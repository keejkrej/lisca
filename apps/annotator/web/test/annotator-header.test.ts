import { Html } from "@effect/ui/html";
import {
  ShellServerProbe,
  ShellServerProvider,
  ShellThemeProvider,
  ShellWorkspaceProvider,
} from "@lisca/ui/shell";
import { Layer, Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { resetAnnotatorRegistry } from "../src/atoms/annotator-ui-atoms";
import { AnnotatorHeader } from "../src/components/annotator-header";
import { AnnotatePageProvider } from "../src/state/annotate-page-context";
import { cleanupMounted, mountTest } from "./render-helper";

const AnnotatorHeaderHost = Html.component({
  name: "AnnotatorHeaderTestHost",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    ShellThemeProvider(h, {
      props: { appId: "annotator" },
      view: () =>
        ShellServerProvider(h, {
          props: {},
          view: () =>
            ShellWorkspaceProvider(h, {
              props: {},
              view: () =>
                AnnotatePageProvider(h, {
                  children: AnnotatorHeader(h, { props: {} }),
                }),
            }),
        }),
    }),
});

afterEach(async () => {
  await cleanupMounted();
  resetAnnotatorRegistry();
});

describe("AnnotatorHeader", () => {
  it("offers an outline workspace button and no task center", async () => {
    const { container } = await mountTest(
      AnnotatorHeaderHost,
      {},
      {
        layer: Layer.succeed(ShellServerProbe, () => new Promise(() => undefined)),
      },
    );

    const buttons = Array.from(container.querySelectorAll("button"));
    const workspace = buttons.find(
      (btn) => btn.getAttribute("aria-label") === "Workspace: not set",
    );
    expect(workspace).toBeTruthy();
    expect(workspace?.className).toContain("z-button-variant-outline");

    const tasks = buttons.find((btn) =>
      /^Tasks/.test(btn.getAttribute("aria-label") ?? btn.textContent?.trim() ?? ""),
    );
    expect(tasks).toBeUndefined();

    const source = buttons.find((btn) =>
      /^Source/.test(btn.getAttribute("aria-label") ?? btn.textContent?.trim() ?? ""),
    );
    expect(source).toBeUndefined();
  });
});
