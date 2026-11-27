import { Html } from "@effect/ui/html";
import { LabelFreeClientPort } from "@lisca/instrument";
import { Layer, Schema } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { studioLabelFreeClient } from "../src/components/label-free-references";
import { StudioSettings } from "../src/components/studio-settings";
import {
  cleanupMounted,
  clickElement,
  mountTest,
  setInputValue,
  waitForCondition,
} from "./render-helper";

const unconfiguredHealth = {
  apiVersion: 1,
  provider: "openrouter",
  configured: false,
  modelId: "google/gemini-embedding-2",
  revision: "v1",
  dimensions: 768,
  batchSize: 32,
  cacheCap: 4096,
};

let fetchHandler: typeof fetch = async () => Response.json(unconfiguredHealth);
const fetchImpl: typeof fetch = (input, init) => fetchHandler(input, init);

const SettingsHost = Html.component({
  name: "StudioSettingsTestHost",
  props: Schema.Struct({}),
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: {},
  view: (h) => StudioSettings(h, { key: "studio-settings" }),
});

function findButton(container: HTMLElement, name: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
    const text = (button.textContent ?? "").trim();
    const aria = (button.getAttribute("aria-label") ?? "").trim();
    return text === name || aria === name;
  });
}

function findInputByLabel(container: HTMLElement, labelText: string): HTMLInputElement | null {
  const label = Array.from(container.querySelectorAll<HTMLLabelElement>("label")).find(
    (el) => (el.textContent ?? "").trim() === labelText,
  );
  if (!label) return null;
  const forId = label.getAttribute("for");
  if (!forId) return null;
  return container.querySelector<HTMLInputElement>(`#${forId}`);
}

async function mountSettings() {
  return mountTest(
    SettingsHost as any,
    {},
    {
      layer: Layer.succeed(LabelFreeClientPort, studioLabelFreeClient) as any,
    },
  );
}

async function openSettings() {
  const mounted = await mountSettings();
  clickElement(findButton(mounted.container, "Settings")!);
  await waitForCondition(() => findButton(mounted.container, "Updates"));
  return mounted;
}

beforeEach(() => {
  fetchHandler = async () => Response.json(unconfiguredHealth);
  vi.stubGlobal("fetch", fetchImpl);
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: () => undefined,
      matches: false,
      media: query,
      removeEventListener: () => undefined,
    })),
  );
});

afterEach(async () => {
  await cleanupMounted();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "liscaDesktop");
});

describe("StudioSettings", () => {
  it("shows OpenRouter API key configuration with no endpoint URL field", async () => {
    const { container } = await openSettings();
    clickElement(findButton(container, "Inference")!);

    await waitForCondition(() =>
      /No OpenRouter API key is configured yet/i.test(container.textContent ?? ""),
    );
    expect(container.textContent).toContain("google/gemini-embedding-2 (768 dimensions)");
    expect(findInputByLabel(container, "Server address")).toBeNull();
    const keyInput = findInputByLabel(container, "OpenRouter API key")!;
    expect(keyInput).not.toBeNull();
    expect(keyInput.disabled).toBe(false);
    expect(findButton(container, "Save API key")?.hasAttribute("disabled")).toBe(false);
    expect(findButton(container, "Inference")?.getAttribute("aria-current")).toBe("page");
    expect(findButton(container, "Updates")?.getAttribute("aria-current")).toBeNull();
  });

  it("saves the OpenRouter API key and updates status to configured", async () => {
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = input instanceof Request ? input.method : (init?.method ?? "GET");
      if (method === "POST" && url.includes("/studio/label-free/key")) {
        return Response.json({
          ...unconfiguredHealth,
          configured: true,
        });
      }
      return Response.json(unconfiguredHealth);
    });
    fetchHandler = transport;

    const { container } = await openSettings();
    clickElement(findButton(container, "Inference")!);
    const keyInput = await waitForCondition(() =>
      findInputByLabel(container, "OpenRouter API key"),
    );
    setInputValue(keyInput, "sk-or-v1-test");
    clickElement(findButton(container, "Save API key")!);

    await waitForCondition(() =>
      /OpenRouter API key saved for this session/i.test(container.textContent ?? ""),
    );
    expect(container.textContent).not.toMatch(/No OpenRouter API key is configured yet/i);
    expect(container.textContent).toMatch(/OpenRouter API key is configured\./i);
    expect(container.textContent).toMatch(/OpenRouter API key saved for this session/i);
  });

  it("switches label-free embedding to the local Ollama provider", async () => {
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const method = input instanceof Request ? input.method : (init?.method ?? "GET");
      if (method === "POST" && url.includes("/studio/label-free/key")) {
        return Response.json({
          ...unconfiguredHealth,
          provider: "ollama",
          configured: true,
          modelId: "embeddinggemma-2:latest",
          batchSize: 8,
        });
      }
      return Response.json(unconfiguredHealth);
    });
    fetchHandler = transport;

    const { container } = await openSettings();
    clickElement(findButton(container, "Inference")!);
    const ollamaButton = await waitForCondition(() => findButton(container, "Local Ollama"));
    clickElement(ollamaButton);

    await waitForCondition(() =>
      /Local inference needs no API key/i.test(container.textContent ?? ""),
    );
    expect(findInputByLabel(container, "OpenRouter API key")).toBeNull();
  });

  it("enables the desktop-owned MCP server from the Agents tab", async () => {
    const status = {
      product: "studio",
      enabled: true,
      running: true,
      url: "http://127.0.0.1:19770/mcp",
      token: "test-token",
      toolCount: 49,
      claudeCommand:
        'claude mcp add --transport http lisca-studio http://127.0.0.1:19770/mcp --header "Authorization: Bearer test-token"',
    };
    const mcpStatus = vi.fn(async () => status);
    const mcpSetEnabled = vi.fn(async (enabled: boolean) => ({ ...status, enabled }));
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: { product: "studio", mcpStatus, mcpSetEnabled },
    });

    const { container } = await openSettings();
    clickElement(findButton(container, "Agents")!);

    await waitForCondition(() => /MCP is running with 49 tools/i.test(container.textContent ?? ""));
    expect(container.textContent).toMatch(/claude mcp add --transport http/i);
    clickElement(findButton(container, "Disable MCP")!);
    await waitForCondition(() => mcpSetEnabled.mock.calls.length === 1);
    expect(mcpSetEnabled).toHaveBeenCalledWith(false);
  });

  it("explains desktop update checks in the browser", async () => {
    const { container } = await mountSettings();
    const gear = findButton(container, "Settings")!;
    expect(gear.className).toContain("z-button-variant-outline");
    clickElement(gear);
    await waitForCondition(() => findButton(container, "Updates"));
    expect(findButton(container, "Updates")?.getAttribute("aria-current")).toBe("page");
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.textContent).toMatch(/desktop app checks for updates/i);
    expect(findButton(container, "Check for updates on startup")).toBeUndefined();
    document.cookie = "sidebar_state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", metaKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.cookie).not.toContain("sidebar_state=");
  });

  it("saves the startup check from the Updates tab", async () => {
    const updateCheckEnabled = vi.fn(async () => true);
    const setUpdateCheckEnabled = vi.fn(async () => undefined);
    Object.defineProperty(window, "liscaDesktop", {
      configurable: true,
      value: { product: "studio", updateCheckEnabled, setUpdateCheckEnabled },
    });

    const { container } = await openSettings();
    const toggle = await waitForCondition(() =>
      findButton(container, "Check for updates on startup"),
    );
    expect(toggle.querySelector("[data-slot='instrument-toggle-indicator']")).toBeTruthy();
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    clickElement(toggle);
    await waitForCondition(() => setUpdateCheckEnabled.mock.calls.length === 1);
    expect(setUpdateCheckEnabled).toHaveBeenCalledWith(false);
  });
});
