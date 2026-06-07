import { Spinner } from "@lisca/ui/components";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, ViewTransition } from "react";

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
    <Suspense
      fallback={
        <ViewTransition exit="fade-out" default="none">
          <ResultPageFallback />
        </ViewTransition>
      }
    >
      <ViewTransition enter="fade-in" default="none">
        <ResultPage />
      </ViewTransition>
    </Suspense>
  ),
});
