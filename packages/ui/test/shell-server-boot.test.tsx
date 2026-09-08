import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { ShellServerProvider, useShellServer } from "../src/shell/server/shell-server";

function setSearch(search: string): () => void {
  window.history.replaceState({}, "", `/${search}`);
  return () => {
    window.history.replaceState({}, "", "/");
  };
}

function captureServer(captured: { current: ReturnType<typeof useShellServer> | null }) {
  return function Probe() {
    captured.current = useShellServer();
    return <></>;
  };
}

afterEach(() => {
  cleanup();
});

describe("ShellServerProvider boot — liscaHttp stray percent", () => {
  it("boots without throwing when liscaHttp single-decodes to a stray percent", () => {
    const restore = setSearch("?liscaHttp=http://host:8765/stats/50%off");
    try {
      expect(() =>
        render(() => (
          <ShellServerProvider defaultPort={8765}>
            <>{null}</>
          </ShellServerProvider>
        )),
      ).not.toThrow();
    } finally {
      restore();
    }
  });

  it("resolves the httpBaseUrl verbatim (with the stray percent) at boot", () => {
    const restore = setSearch("?liscaHttp=http://host:8765/stats/50%off");
    try {
      const captured: { current: ReturnType<typeof useShellServer> | null } = { current: null };
      const Probe = captureServer(captured);
      render(() => (
        <ShellServerProvider defaultPort={8765}>
          <Probe />
        </ShellServerProvider>
      ));
      expect(captured.current).not.toBeNull();
      expect(captured.current!.httpBaseUrl).toBe("http://host:8765/stats/50%off");
      expect(captured.current!.localLabel).toBe("host:8765");
    } finally {
      restore();
    }
  });

  it("boots and resolves a normal liscaHttp origin (no regression)", () => {
    const restore = setSearch("?liscaHttp=http://192.168.1.10:8765");
    try {
      const captured: { current: ReturnType<typeof useShellServer> | null } = { current: null };
      const Probe = captureServer(captured);
      render(() => (
        <ShellServerProvider defaultPort={8765}>
          <Probe />
        </ShellServerProvider>
      ));
      expect(captured.current!.httpBaseUrl).toBe("http://192.168.1.10:8765");
      expect(captured.current!.localLabel).toBe("192.168.1.10:8765");
    } finally {
      restore();
    }
  });

  it("falls back to the browser origin when liscaHttp is absent (no regression)", () => {
    const restore = setSearch("");
    try {
      const captured: { current: ReturnType<typeof useShellServer> | null } = { current: null };
      const Probe = captureServer(captured);
      render(() => (
        <ShellServerProvider defaultPort={8765} appId="annotator">
          <Probe />
        </ShellServerProvider>
      ));
      expect(captured.current!.httpBaseUrl).toBe("http://localhost:3000");
    } finally {
      restore();
    }
  });
});
