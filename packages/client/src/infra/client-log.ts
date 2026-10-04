import { liscaDesktopBridge } from "./desktop";

const clientLogPath = "/fs/client-log";
const flushDelayMs = 300;
const maxQueuedLines = 100;
const maxLineLength = 2000;

let installed = false;
let flushing = false;
let appLabel = "lisca";
const queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function formatCause(value: unknown): string {
  if (value instanceof Error) {
    const stack = value.stack ? ` ${value.stack}` : "";
    return `${value.name}: ${value.message}${stack}`;
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function oneLine(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .slice(0, maxLineLength)
    .trim();
}

function enqueue(message: string): void {
  if (!installed || flushing) return;
  const line = oneLine(message);
  if (!line || line.includes(clientLogPath)) return;
  queue.push(`${appLabel} ${line}`);
  if (queue.length > maxQueuedLines) queue.splice(0, queue.length - maxQueuedLines);
  if (timer != null) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, flushDelayMs);
}

async function postLines(lines: string[]): Promise<void> {
  const body = JSON.stringify({ lines });
  const bridge = liscaDesktopBridge();
  if (bridge) {
    await bridge.request({
      method: "POST",
      uri: clientLogPath,
      headers: { "content-type": "application/json" },
      body,
    });
    return;
  }
  await fetch(clientLogPath, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

async function flush(): Promise<void> {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const lines = queue.splice(0, queue.length);
  try {
    await postLines(lines);
  } catch {
    // Drop the batch. Requeueing a failed debug post would loop on the failure.
  } finally {
    flushing = false;
  }
}

/** Record a workflow line once `installClientLog` is running. No-ops before that. */
export function logClientEvent(message: string): void {
  enqueue(message);
}

/**
 * Send window errors and console warnings to this process's session log
 * (`~/.lisca/logs/<app>/<datetime>.log` on the desktop and server). Safe to call once per page.
 */
export function installClientLog(appId: string): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  appLabel = appId;

  window.addEventListener("error", (event) => {
    enqueue(`window.error ${event.message}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    enqueue(`unhandledrejection ${formatCause(event.reason)}`);
  });

  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args: unknown[]) => {
    originalError.apply(console, args);
    enqueue(`console.error ${args.map(formatCause).join(" ")}`);
  };
  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args);
    enqueue(`console.warn ${args.map(formatCause).join(" ")}`);
  };
}
