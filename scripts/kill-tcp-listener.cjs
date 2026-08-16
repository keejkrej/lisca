#!/usr/bin/env node
/** Stop any process listening on a TCP port (dev server restart helper). */
const { execFileSync } = require("node:child_process");

const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port <= 0) {
  process.exit(0);
}

try {
  const output = execFileSync("lsof", ["-ti", `:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (!output) {
    process.exit(0);
  }
  for (const pidText of output.split("\n")) {
    const pid = Number(pidText);
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // already exited
      }
    }
  }
} catch {
  // nothing listening
}
