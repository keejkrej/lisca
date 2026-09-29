import { Spinner } from "@lisca/ui/components";
import { createFileRoute } from "@tanstack/solid-router";
import { lazy, Suspense } from "solid-js";

const AnalysisPage = lazy(() => import("../analysis/analysis-page"));

function AnalysisPageFallback() {
  return (
    <div class="flex h-full items-center justify-center">
      <Spinner class="size-4" />
    </div>
  );
}

export const Route = createFileRoute("/analysis")({
  component: () => (
    <Suspense fallback={<AnalysisPageFallback />}>
      <AnalysisPage />
    </Suspense>
  ),
});
