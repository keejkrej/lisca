import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { createInitialAlignUiState, createStudioPersist } from "@lisca/client/atoms/align-ui";
import {
  STUDIO_ALIGN_SESSION_KEY,
  readStudioAlignSession,
} from "@lisca/client/atoms/align-ui-studio";
import { writeWorkSessions, type WorkSession } from "@lisca/client/session/work-session";
import {
  createWorkSessionGate,
  type WorkSessionGateController,
} from "@lisca/client/session/work-session-gate";
import { configureLiscaStorage, type LiscaStorageAdapter } from "@lisca/utils";
import { Effect, Queue, Schema, Stream } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { cleanupMounted, clickElement, mountTest, waitForCondition } from "./render-helper";

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

const GateHarnessMsg = UiSchema.TaggedEnum({
  GateChanged: {},
  Restore: { sessionId: Schema.String },
  StartNew: {},
});

function FakePicker<M>(
  h: Html.H<M>,
  options: {
    readonly open: boolean;
    readonly sessions: readonly WorkSession[];
    readonly onRestore: (sessionId: string) => M;
    readonly onStartNew: M;
  },
) {
  const first = options.sessions[0];
  return h.div
    .attr("data-testid", "picker")
    .attr("data-open", String(options.open))
    .children(
      h.span.children(`PICKER_OPEN:${String(options.open)}`),
      h.button
        .attr("data-testid", "restore-first")
        .attr("type", "button")
        .on("click", () => (first ? options.onRestore(first.id) : undefined))
        .children("Restore"),
      h.button
        .attr("data-testid", "start-new")
        .attr("type", "button")
        .on("click", options.onStartNew)
        .children("Start new"),
    );
}

async function mountGate(
  onRestore: (session: WorkSession) => void | Promise<void>,
  children: string,
) {
  const skipResumePicker = readStudioAlignSession() != null;
  const controller: WorkSessionGateController = createWorkSessionGate("studio", onRestore, {
    skipResumePicker,
  });

  const GateHarness = Html.component({
    name: "StudioResumeGateHarness",
    props: Schema.Struct({}),
    model: Schema.Struct({
      version: Schema.Number,
    }),
    message: GateHarnessMsg,
  }).make({
    init: () => ({ version: 0 }),
    update: {
      GateChanged: ($) => $.evolve({ version: (v) => v + 1 }),
      Restore: ($, { sessionId }) => {
        const target = controller.getState().sessions.find((s) => s.id === sessionId);
        if (target) controller.restoreSession(target);
        return $.evolve({ version: (v) => v + 1 });
      },
      StartNew: ($) => {
        controller.startNewSession();
        return $.evolve({ version: (v) => v + 1 });
      },
    },
    subscriptions: () => [
      Subscription.make("resume-gate-sub", "mounted", () =>
        Stream.callback<typeof GateHarnessMsg.Type>((queue) => {
          const unsub = controller.subscribe(() => {
            Queue.offerUnsafe(queue, GateHarnessMsg.GateChanged());
          });
          return Effect.addFinalizer(() => Effect.sync(unsub));
        }),
      ),
    ],
    view: (h) => {
      const state = controller.getState();
      return h.div.children(
        FakePicker(h, {
          open: state.open,
          sessions: state.sessions,
          onRestore: (sessionId) => GateHarnessMsg.Restore({ sessionId }),
          onStartNew: GateHarnessMsg.StartNew(),
        }),
        state.ready ? h.p.children(children) : undefined,
      );
    },
  });

  const view = await mountTest(GateHarness, {});
  return { skipResumePicker, view };
}

describe("Studio resume-picker gate decision — bug fix (G3.9-G3.12)", () => {
  beforeEach(() => {
    configureLiscaStorage({ local: createMemoryStorage(), session: createMemoryStorage() });
  });

  afterEach(async () => {
    await cleanupMounted();
  });

  it("shows the resume picker when an INCOMPLETE studio align-session is persisted and saved work-sessions exist (G3.9)", async () => {
    seedSavedStudioWorkSession();
    seedStudioAlignSession("/ws", null);
    expect(readStudioAlignSession()).toBeNull();

    const { skipResumePicker, view } = await mountGate(vi.fn(), "CHILD_CONTENT");

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
    const { view } = await mountGate(onRestore, "CHILD_CONTENT");

    const button = view.container.querySelector<HTMLButtonElement>('[data-testid="restore-first"]');
    expect(button).not.toBeNull();
    clickElement(button!);

    await waitForCondition(() => onRestore.mock.calls.length === 1);
    expect(onRestore.mock.calls[0]![0]).toMatchObject({
      id: "ws-1",
      assayJsonPath: "/ws/assay.json",
    });
  });

  it("suppresses the picker and renders children when a COMPLETE studio align-session is persisted (G3.10, no silent-reload regression)", async () => {
    seedSavedStudioWorkSession();
    seedStudioAlignSession("/ws", folderSource);
    expect(readStudioAlignSession()).not.toBeNull();

    const { skipResumePicker, view } = await mountGate(vi.fn(), "CHILD_CONTENT");

    expect(skipResumePicker).toBe(true);
    const picker = view.container.querySelector('[data-testid="picker"]');
    expect(picker?.getAttribute("data-open")).toBe("false");
    expect(view.container.textContent).toContain("CHILD_CONTENT");
  });

  it("shows the resume picker when no studio align-session is persisted but saved work-sessions exist (G3.11)", async () => {
    seedSavedStudioWorkSession();
    const { skipResumePicker, view } = await mountGate(vi.fn(), "CHILD_CONTENT");

    expect(skipResumePicker).toBe(false);
    const picker = view.container.querySelector('[data-testid="picker"]');
    expect(picker?.getAttribute("data-open")).toBe("true");
  });

  it("does not show the picker when there are no saved work-sessions for the server (edge case that hid the bug)", async () => {
    seedStudioAlignSession("/ws", null);
    const { skipResumePicker, view } = await mountGate(vi.fn(), "CHILD_CONTENT");

    expect(skipResumePicker).toBe(false);
    const picker = view.container.querySelector('[data-testid="picker"]');
    expect(picker?.getAttribute("data-open")).toBe("false");
    expect(view.container.textContent).toContain("CHILD_CONTENT");
  });
});
