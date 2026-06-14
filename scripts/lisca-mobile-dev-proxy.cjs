#!/usr/bin/env node
/**
 * Dev proxy for `bun lisca dev * web-native`.
 *
 * Browser opens the public mobile port (808x). API routes are forwarded to Rust
 * (876x); everything else (bundler, HMR, Expo devtools) goes to Expo (908x).
 */
const http = require("node:http");
const net = require("node:net");
const { isLiscaApiProxyPath } = require("./lisca-dev-proxy-shared.cjs");

function parseArgs() {
  const args = process.argv.slice(2);
  let listen;
  let expo;
  let rust;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--listen") listen = Number(args[++i]);
    else if (args[i] === "--expo") expo = Number(args[++i]);
    else if (args[i] === "--rust") rust = Number(args[++i]);
  }
  if (!listen || !expo || !rust) {
    console.error(
      "Usage: lisca-mobile-dev-proxy.cjs --listen <port> --expo <port> --rust <port>",
    );
    process.exit(1);
  }
  return { listen, expo, rust };
}

function pipeHttp(req, res, port) {
  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port,
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
    }
    res.end("Bad Gateway");
  });
  req.pipe(proxyReq);
}

function relayUpgrade(req, socket, head, port) {
  const upstream = net.connect({ host: "127.0.0.1", port });
  // Pipe before forwarding the handshake so the 101 Switching Protocols response
  // is not lost when the upstream answers immediately.
  upstream.pipe(socket);
  socket.pipe(upstream);

  upstream.on("connect", () => {
    const headers = { ...req.headers, host: `127.0.0.1:${port}` };
    let raw = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const entry of value) raw += `${key}: ${entry}\r\n`;
      } else {
        raw += `${key}: ${value}\r\n`;
      }
    }
    raw += "\r\n";
    upstream.write(raw);
    if (head?.length) upstream.write(head);
  });

  const destroy = () => {
    socket.destroy();
    upstream.destroy();
  };
  upstream.on("error", destroy);
  socket.on("error", destroy);
}

const { listen, expo, rust } = parseArgs();

const server = http.createServer((req, res) => {
  pipeHttp(req, res, isLiscaApiProxyPath(req.url ?? "/") ? rust : expo);
});

server.on("upgrade", (req, socket, head) => {
  relayUpgrade(req, socket, head, isLiscaApiProxyPath(req.url ?? "/") ? rust : expo);
});

server.listen(listen, "127.0.0.1", () => {
  console.log(
    `[lisca] mobile dev proxy http://127.0.0.1:${listen} → expo ${expo}, API → rust ${rust}`,
  );
});
