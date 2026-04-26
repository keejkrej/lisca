import { QueryClient } from "@tanstack/react-query";

export function createLiscaQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        /** One retry helps transient desktop IPC hiccups without aggressive backoff. */
        retry: 1,
      },
    },
  });
}
