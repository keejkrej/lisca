import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ShellServerProvider, useShellServer } from "../src/shell/server/shell-server";

function captureServer(captured: { current: ReturnType<typeof useShellServer> | null }) {
  return function Probe() {
    captured.current = useShellServer();
    return <></>;
  };
}

afterEach(cleanup);

describe("ShellServerProvider", () => {
  it("does not probe in desktop builds, where the backend runs in-process", () => {
    Object.defineProperty(window, "liscaDesktop", { configurable: true, value: {} });
    try {
      let probed = false;
      const captured: { current: ReturnType<typeof useShellServer> | null } = { current: null };
      const Probe = captureServer(captured);
      render(() => (
        <ShellServerProvider
          probe={() => {
            probed = true;
            return Promise.resolve();
          }}
        >
          <Probe />
        </ShellServerProvider>
      ));
      expect(probed).toBe(false);
      expect(captured.current!.state).toBe("idle");
    } finally {
      Reflect.deleteProperty(window, "liscaDesktop");
    }
  });

  it("probes the server in web builds", () => {
    let probed = false;
    render(() => (
      <ShellServerProvider
        probe={() => {
          probed = true;
          return new Promise(() => undefined);
        }}
      >
        <>{null}</>
      </ShellServerProvider>
    ));
    expect(probed).toBe(true);
  });
});
