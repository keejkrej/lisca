interface ImportMetaEnv {
  /** Set by Vite `--mode mock`. Absent in dev, production, and desktop builds. */
  readonly VITE_LISCA_MOCK?: string;
  /** Absolute `assay.json` path baked in by `pnpm run dev:studio-mock`. */
  readonly VITE_LISCA_MOCK_ASSAY?: string;
}
