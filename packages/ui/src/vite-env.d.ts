interface ImportMetaEnv {
  readonly VITE_HTTP_URL?: string;
  readonly VITE_HTTP_HOST?: string;
  readonly VITE_HTTP_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
