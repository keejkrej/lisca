export function formatWsUrl(host: string, port: number, path: string): string {
  const proto = host === "localhost" || host === "127.0.0.1" ? "ws" : "wss";
  return `${proto}://${host}:${port}${path.startsWith("/") ? path : `/${path}`}`;
}
