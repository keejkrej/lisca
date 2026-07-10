import { Spinner } from "@lisca/ui/components";
import { createFileRoute } from "@tanstack/solid-router";
import { lazy, Suspense } from "solid-js";

const ResultPage = lazy(() => import("../result/result-page"));

function ResultPageFallback() {
  return (
    <div class="flex h-full items-center justify-center">
      <Spinner class="size-4" />
    </div>
  );
}

export const Route = createFileRoute("/result")({
  component: () => (
    <Suspense fallback={<ResultPageFallback />}>
      <ResultPage />
    </Suspense>
  ),
});