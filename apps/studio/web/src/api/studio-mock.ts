export type StudioMockEnv = {
  VITE_LISCA_MOCK?: string;
  VITE_LISCA_MOCK_ASSAY?: string;
};

/**
 * Assay opened by the browser mock. `pnpm run dev:studio-mock` sets the env
 * vars; every other build leaves them unset, so this returns null.
 */
export function studioMockAssayPath(env: StudioMockEnv = import.meta.env): string | null {
  if (env.VITE_LISCA_MOCK !== "1") return null;
  const assayPath = env.VITE_LISCA_MOCK_ASSAY;
  if (typeof assayPath !== "string") return null;
  const trimmed = assayPath.trim();
  return trimmed.length > 0 ? trimmed : null;
}
