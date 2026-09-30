import { cleanup, render } from "@solidjs/testing-library";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { writeWorkSessions, type WorkSession } from "@lisca/client/session/work-session";
import {
  WorkSessionAppGate,
  useWorkSessionRecents,
  type WorkSessionPickerDialogComponent,
  type WorkSessionRecents,
} from "@lisca/client/session/work-session-app-gate";

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

const source = { kind: "nd2" as const, path: "/data/run.nd2" };
const older: WorkSession = {
  id: "a",
  workspacePath: "/ws/old",
  source,
  lastOpenedAt: "2026-01-01T00:00:00.000Z",
};
const newer: WorkSession = {
  id: "b",
  workspacePath: "/ws/new",
  source,
  label: "Run B",
  lastOpenedAt: "2026-02-01T00:00:00.000Z",
};

const Picker: WorkSessionPickerDialogComponent = (props) => (
  <p data-testid="picker">{String(props.open)}</p>
);

function mount(onRestore: (session: WorkSession) => boolean | undefined) {
  let recents!: WorkSessionRecents;
  function Probe() {
    recents = useWorkSessionRecents();
    return <p>ready</p>;
  }
  const view = render(() => (
    <WorkSessionAppGate
      appId="aligner"
      gateOptions={{ skipResumePicker: true }}
      PickerDialog={Picker}
      onRestore={onRestore}
    >
      <Probe />
    </WorkSessionAppGate>
  ));
  return { view, recents: () => recents };
}

beforeEach(() => {
  configureLiscaStorage({ local: createMemoryStorage(), session: createMemoryStorage() });
  writeWorkSessions("aligner", [older, newer]);
});
afterEach(() => cleanup());

describe("work-session recents (replacing the resume dialog)", () => {
  it("skips the dialog and lists recent workspaces newest first", () => {
    const { view, recents } = mount(() => true);
    expect(view.getByTestId("picker").textContent).toBe("false");
    expect(view.getByText("ready")).not.toBeNull();
    expect(recents().items()).toEqual([
      { path: "/ws/new", label: "Run B" },
      { path: "/ws/old", label: undefined },
    ]);
  });

  it("restores the session behind a picked recent", async () => {
    const onRestore = vi.fn(() => true);
    const { recents } = mount(onRestore);
    await expect(recents().restore("/ws/old")).resolves.toBe(true);
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: "a", source }));
  });

  it("reports false for unknown paths or sessions that cannot restore", async () => {
    const { recents } = mount(() => false);
    await expect(recents().restore("/ws/elsewhere")).resolves.toBe(false);
    await expect(recents().restore("/ws/new")).resolves.toBe(false);
  });
});
