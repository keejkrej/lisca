import { Spinner } from "@lisca/ui";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ResultPage = lazy(() => import("../result/result-page"));

function ResultPageFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner className="size-4" />
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
