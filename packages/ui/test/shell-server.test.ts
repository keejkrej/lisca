import { Html } from "@effect/ui/html";
import { Layer, Schema } from "effect";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ShellServerProbe, ShellServerProvider } from "../src/shell/server/shell-server";
import { cleanupMounted, flushMicrotasks, mountTest } from "./render-helper";

afterEach(cleanupMounted);

const ProbeReader = Html.component({
  name: "ProbeReader",
  model: Schema.Struct({}),
  message: Schema.Never,
  reads: { server: ShellServerProvider },
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) => h.span.attr("data-state", h.reads.server.state).children(h.reads.server.state),
});

const ServerHost = Html.component({
  name: "ServerHost",
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) =>
    ShellServerProvider(h, {
      props: {},
      view: () => ProbeReader(h, { props: {} }),
    }),
});

describe("ShellServerProvider", () => {
  it("does not probe in desktop builds, where the backend runs in-process", async () => {
    Object.defineProperty(window, "liscaDesktop", { configurable: true, value: {} });
    try {
      let probed = false;
      const view = await mountTest(
        ServerHost,
        {},
        {
          layer: Layer.succeed(ShellServerProbe, () => {
            probed = true;
            return Promise.resolve();
          }),
        },
      );
      await flushMicrotasks();
      expect(probed).toBe(false);
      expect(view.container.querySelector("[data-state]")?.getAttribute("data-state")).toBe("idle");
    } finally {
      Reflect.deleteProperty(window, "liscaDesktop");
    }
  });

  it("probes the server in web builds", async () => {
    let probed = false;
    await mountTest(
      ServerHost,
      {},
      {
        layer: Layer.succeed(ShellServerProbe, () => {
          probed = true;
          return new Promise(() => undefined);
        }),
      },
    );
    await flushMicrotasks();
    expect(probed).toBe(true);
  });
});
