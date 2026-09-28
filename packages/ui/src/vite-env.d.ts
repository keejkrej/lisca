interface ImportMetaEnv {
  /** Vite dev server (development) vs a production build. */
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
