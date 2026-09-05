import { cleanup, render } from "@solidjs/testing-library";
import {
  configureLiscaStorage,
  setLiscaActiveServerAddress,
  type LiscaStorageAdapter,
} from "@lisca/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialAlignUiState, createStudioPersist } from "@lisca/client/atoms/align-ui";
import {
  STUDIO_ALIGN_SESSION_KEY,
  readStudioAlignSession,
} from "@lisca/client/atoms/align-ui-studio";
import { writeWorkSessions, type WorkSession } from "@lisca/client/session/work-session";
import { WorkSessionAppGate } from "@lisca/client/session/work-session-app-gate";
import type { WorkSessionPickerDialogComponent } from "@lisca/client/session/work-session-app-gate";

function createMemoryStorage(): LiscaStorageAdapter {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

const folderSource = {
  kind: "folder" as const,
  path: "/data/src",
  subfolderTemplate: "Pos{pos}",
  filenameTemplate: "img.tif",
};

const savedWorkSession: WorkSession = {
  id: "ws-1",
  server: "local",
  workspacePath: "/ws",
  assayJsonPath: "/ws/assay.json",
  label: "assay",
  lastOpenedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

function seedSavedStudioWorkSession() {
  writeWorkSessions("studio", [savedWorkSession]);
}

function seedStudioAlignSession(workspacePath: string | null, source: typeof folderSource | null) {
  createStudioPersist(STUDIO_ALIGN_SESSION_KEY).write({
    ...createInitialAlignUiState(),
    workspacePath,
    source,
  });
}

function FakePicker(props: Parameters<WorkSessionPickerDialogComponent>[0]) {
  return (
    <div data-testid="picker" data-open={String(props.open)}>
      <span>PICKER_OPEN:{String(props.open)}</span>
      <button
        data-testid="restore-first"
        onClick={() => {
          const s = props.sessions[0];
          if (s) props.onRestore(s.id);
        }}
      >
        Restore
      </button>
      <button data-testid="start-new" onClick={() => props.onStartNew()}>
        Start new
      </button>
    </div>
  );
}

function mountGate(onRestore: (session: WorkSession) => void | Promise<void>, children: string) {
  const skipResumePicker = readStudioAlignSession() != null;
  const view = render(() => (
    <WorkSessionAppGate
      appId="studio"
      PickerDialog={FakePicker}
      gateOptions={{ skipResumePicker }}
      onRestore={onRestore}
    >
      <p>{children}</p>
    </WorkSessionAppGate>
  ));
  return { skipResumePicker, view };
}

describe("Studio resume-picker gate decision — bug fix (G3.9-G3.12)", () => {
  beforeEach(() => {
    configureLiscaStorage({ local: createMemoryStorage(), session: createMemoryStorage() });
    setLiscaActiveServerAddress(null);
  });
  afterEach(() => cleanup());

  it("shows the resume picker when an INCOMPLETE studio align-session is persisted and saved work-sessions exist (G3.9)", () => {
    seedSavedStudioWorkSession();
    seedStudioAlignSession("/ws", null);
    expect(readStudioAlignSession()).toBeNull();

    const { skipResumePicker, view } = mountGate(vi.fn(), "CHILD_CONTENT");

    expect(skipResumePicker).toBe(false);
    const picker = view.container.querySelector('[data-testid="picker"]');
    expect(picker).not.toBeNull();
    expect(picker?.getAttribute("data-open")).toBe("true");
    expect(view.container.querySelector('[data-testid="restore-first"]')).not.toBeNull();
    expect(view.container.textContent).not.toContain("CHILD_CONTENT");
  });

  it("invokes onRestore (restoreStudioSession) when the user picks a session from the picker (G3.12)", async () => {
    seedSavedStudioWorkSession();
    seedStudioAlignSession("/ws", null);
    const onRestore = vi.fn();
    const { view } = mountGate(onRestore, "CHILD_CONTENT");

    const button = view.container.querySelector<HTMLButtonElement>('[data-testid="restore-first"]');
    expect(button).not.toBeNull();
    button!.click();

    await vi.waitFor(() => expect(onRestore).toHaveBeenCalledTimes(1));
    expect(onRestore.mock.calls[0][0]).toMatchObject({
      id: "ws-1",
      server: "local",
      assayJsonPath: "/ws/assay.json",
    });
  });

  it("suppresses the picker and renders children when a COMPLETE studio align-session is persisted (G3.10, no silent-reload regression)", () => {
    seedSavedStudioWorkSession();
    seedStudioAlignSession("/ws", folderSource);
    expect(readStudioAlignSession()).not.toBeNull();

    const { skipResumePicker, view } = mountGate(vi.fn(), "CHILD_CONTENT");

    expect(skipResumePicker).toBe(true);
    const picker = view.container.querySelector('[data-testid="picker"]');
    expect(picker?.getAttribute("data-open")).toBe("false");
    expect(view.container.textContent).toContain("CHILD_CONTENT");
  });

  it("shows the resume picker when no studio align-session is persisted but saved work-sessions exist (G3.11)", () => {
    seedSavedStudioWorkSession();
    const { skipResumePicker, view } = mountGate(vi.fn(), "CHILD_CONTENT");

    expect(skipResumePicker).toBe(false);
    const picker = view.container.querySelector('[data-testid="picker"]');
    expect(picker?.getAttribute("data-open")).toBe("true");
  });

  it("does not show the picker when there are no saved work-sessions for the server (edge case that hid the bug)", () => {
    seedStudioAlignSession("/ws", null);
    const { skipResumePicker, view } = mountGate(vi.fn(), "CHILD_CONTENT");

    expect(skipResumePicker).toBe(false);
    const picker = view.container.querySelector('[data-testid="picker"]');
    expect(picker?.getAttribute("data-open")).toBe("false");
    expect(view.container.textContent).toContain("CHILD_CONTENT");
  });
});
