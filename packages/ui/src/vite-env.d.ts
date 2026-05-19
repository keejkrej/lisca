interface ImportMetaEnv {
  readonly VITE_HTTP_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_WS_HOST?: string;
  readonly VITE_WS_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
